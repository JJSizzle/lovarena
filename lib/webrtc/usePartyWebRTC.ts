import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  acquireCameraTrack,
  acquireLocalMedia,
  mediaErrorMessage,
} from "@/lib/webrtc/media-constraints";
import { resolveIceServers } from "@/lib/webrtc/ice-servers";

type SignalOut =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "ready" };

type SignalMessage = SignalOut & { from: string; to: string };

export type PartyRemoteStream = {
  peerId: string;
  stream: MediaStream;
};

type PeerState = {
  pc: RTCPeerConnection;
  iceQueue: RTCIceCandidateInit[];
  isInitiator: boolean;
  remoteStream: MediaStream | null;
};

function isInitiator(localId: string, peerId: string) {
  return localId.localeCompare(peerId) < 0;
}

function applyLocalVideoAttrs(el: HTMLVideoElement | null) {
  if (!el) return;
  el.playsInline = true;
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  el.muted = true;
}

function applyRemoteVideoAttrs(el: HTMLVideoElement | null) {
  if (!el) return;
  el.playsInline = true;
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  el.muted = false;
  el.volume = 1;
}

async function bindVideoElement(
  el: HTMLVideoElement | null,
  stream: MediaStream | null,
  remote: boolean
) {
  if (!el || !stream) return;
  if (el.srcObject !== stream) el.srcObject = stream;
  if (remote) applyRemoteVideoAttrs(el);
  else applyLocalVideoAttrs(el);
  const tryPlay = () => {
    void el.play().catch(() => {});
  };
  el.onloadeddata = tryPlay;
  tryPlay();
  requestAnimationFrame(tryPlay);
}

function hasLiveVideoTrack(stream: MediaStream | null) {
  const track = stream?.getVideoTracks()[0];
  return Boolean(track && track.readyState === "live");
}

export function usePartyWebRTC(
  partyId: string | null,
  userId: string,
  peerIds: string[],
  active: boolean
) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const togglingVideoRef = useRef(false);
  const forceNewStreamRef = useRef(false);

  const [mediaError, setMediaError] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState<PartyRemoteStream[]>([]);
  const [mediaRetryKey, setMediaRetryKey] = useState(0);
  const [previewKey, setPreviewKey] = useState(0);

  const sortedPeerIds = useMemo(
    () => [...peerIds].sort((a, b) => a.localeCompare(b)),
    [peerIds]
  );

  const syncRemoteStreamsState = useCallback(() => {
    const next: PartyRemoteStream[] = [];
    peersRef.current.forEach((state, peerId) => {
      if (state.remoteStream) {
        next.push({ peerId, stream: state.remoteStream });
      }
    });
    setRemoteStreams(next);
  }, []);

  const bindLocalPreview = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    const stream = localStreamRef.current;
    if (el && stream) void bindVideoElement(el, stream, false);
  }, []);

  const registerRemoteVideo = useCallback(
    (peerId: string, el: HTMLVideoElement | null) => {
      if (el) remoteVideoRefs.current.set(peerId, el);
      else remoteVideoRefs.current.delete(peerId);
      const state = peersRef.current.get(peerId);
      if (el && state?.remoteStream) {
        void bindVideoElement(el, state.remoteStream, true);
      }
    },
    []
  );

  const retryMedia = useCallback(() => {
    forceNewStreamRef.current = true;
    setMediaRetryKey((k) => k + 1);
  }, []);

  const stopLocalTracks = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  async function sendSignal(to: string, payload: SignalOut) {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({
      type: "broadcast",
      event: "party-webrtc-signal",
      payload: { ...payload, from: userId, to },
    });
  }

  async function flushIceQueue(state: PeerState) {
    while (state.iceQueue.length > 0) {
      const candidate = state.iceQueue.shift();
      if (candidate) {
        try {
          await state.pc.addIceCandidate(candidate);
        } catch {
          // ignore stale candidates
        }
      }
    }
  }

  async function sendOffer(peerId: string, state: PeerState) {
    if (!state.isInitiator) return;
    try {
      const pc = state.pc;
      if (pc.signalingState === "have-local-offer" && pc.localDescription?.sdp) {
        await sendSignal(peerId, { type: "offer", sdp: pc.localDescription.sdp });
        return;
      }
      if (pc.signalingState !== "stable" && pc.signalingState !== "closed") {
        return;
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (offer.sdp) await sendSignal(peerId, { type: "offer", sdp: offer.sdp });
    } catch {
      // negotiation race
    }
  }

  async function ensureLocalStream(): Promise<MediaStream> {
    const needsFresh =
      forceNewStreamRef.current || !hasLiveVideoTrack(localStreamRef.current);

    if (!needsFresh && localStreamRef.current) return localStreamRef.current;

    forceNewStreamRef.current = false;
    stopLocalTracks();

    const stream = await acquireLocalMedia(false);
    if (!stream) {
      throw new DOMException(
        "Could not open camera or microphone.",
        "NotReadableError"
      );
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) videoTrack.enabled = true;

    localStreamRef.current = stream;
    setVideoEnabled(hasLiveVideoTrack(stream));
    setAudioEnabled(Boolean(stream.getAudioTracks()[0]?.enabled ?? true));
    setPreviewKey((k) => k + 1);
    await bindVideoElement(localVideoRef.current, stream, false);
    return stream;
  }

  const teardownPeer = useCallback(
    (peerId: string) => {
      const state = peersRef.current.get(peerId);
      if (state) {
        state.pc.close();
        peersRef.current.delete(peerId);
      }
      const el = remoteVideoRefs.current.get(peerId);
      if (el) el.srcObject = null;
      syncRemoteStreamsState();
    },
    [syncRemoteStreamsState]
  );

  const teardownAll = useCallback(() => {
    peersRef.current.forEach((_, peerId) => teardownPeer(peerId));
    peersRef.current.clear();
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setRemoteStreams([]);
  }, [teardownPeer]);

  const stopMedia = useCallback(() => {
    stopLocalTracks();
    teardownAll();
    setVideoEnabled(false);
    setAudioEnabled(false);
  }, [stopLocalTracks, teardownAll]);

  async function replaceVideoTrack(newTrack: MediaStreamTrack) {
    const stream = localStreamRef.current;
    if (!stream) return;

    const oldTrack = stream.getVideoTracks()[0];
    if (oldTrack && oldTrack !== newTrack) {
      stream.removeTrack(oldTrack);
      oldTrack.stop();
    }
    if (!stream.getVideoTracks().includes(newTrack)) {
      stream.addTrack(newTrack);
    }

    peersRef.current.forEach((state) => {
      const sender = state.pc
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) void sender.replaceTrack(newTrack);
      else state.pc.addTrack(newTrack, stream);
    });

    newTrack.enabled = true;
    setVideoEnabled(true);
    setMediaError(null);
    setPreviewKey((k) => k + 1);
    await bindVideoElement(localVideoRef.current, stream, false);
  }

  const toggleVideo = useCallback(async () => {
    if (togglingVideoRef.current) return;
    togglingVideoRef.current = true;
    try {
      let stream = localStreamRef.current;
      if (!stream) {
        if (!active) return;
        stream = await ensureLocalStream();
      }

      let track = stream.getVideoTracks()[0];
      const turningOn = !track || !track.enabled || track.readyState === "ended";

      if (turningOn && (!track || track.readyState === "ended")) {
        const { track: newTrack, error } = await acquireCameraTrack();
        if (!newTrack) {
          if (error) setMediaError(error);
          return;
        }
        await replaceVideoTrack(newTrack);
        return;
      }

      if (!track) {
        const { track: newTrack, error } = await acquireCameraTrack();
        if (!newTrack) {
          if (error) setMediaError(error);
          return;
        }
        await replaceVideoTrack(newTrack);
        return;
      }

      track.enabled = turningOn;
      setVideoEnabled(turningOn);
      setMediaError(null);
      if (turningOn) {
        setPreviewKey((k) => k + 1);
        await bindVideoElement(localVideoRef.current, stream, false);
      }
    } catch (err) {
      setMediaError(mediaErrorMessage(err));
    } finally {
      togglingVideoRef.current = false;
    }
  }, [active]);

  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    setAudioEnabled((prev) => {
      const next = !prev;
      track.enabled = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    const stream = localStreamRef.current;
    if (stream && localVideoRef.current) {
      void bindVideoElement(localVideoRef.current, stream, false);
    }
  }, [active, videoEnabled, previewKey]);

  useEffect(() => {
    if (!active || !partyId || !userId) {
      if (!active) stopMedia();
      return;
    }

    let cancelled = false;

    async function handleSignal(msg: SignalMessage) {
      if (!msg?.from || msg.from === userId || msg.to !== userId) return;
      const state = peersRef.current.get(msg.from);
      if (!state) return;

      try {
        if (msg.type === "ready") {
          if (state.isInitiator) await sendOffer(msg.from, state);
          else await sendSignal(msg.from, { type: "ready" });
          return;
        }

        if (msg.type === "offer" && !state.isInitiator) {
          await state.pc.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: msg.sdp })
          );
          await flushIceQueue(state);
          const answer = await state.pc.createAnswer();
          await state.pc.setLocalDescription(answer);
          if (answer.sdp) {
            await sendSignal(msg.from, { type: "answer", sdp: answer.sdp });
          }
          return;
        }

        if (msg.type === "answer" && state.isInitiator) {
          if (state.pc.signalingState === "have-local-offer") {
            await state.pc.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp: msg.sdp })
            );
            await flushIceQueue(state);
          }
          return;
        }

        if (msg.type === "ice") {
          if (state.pc.remoteDescription) {
            await state.pc.addIceCandidate(msg.candidate);
          } else {
            state.iceQueue.push(msg.candidate);
          }
        }
      } catch {
        // negotiation race
      }
    }

    async function connectPeer(peerId: string, stream: MediaStream) {
      if (peersRef.current.has(peerId)) return;

      const pc = new RTCPeerConnection({
        iceServers: await resolveIceServers(),
        bundlePolicy: "max-bundle",
      });

      const state: PeerState = {
        pc,
        iceQueue: [],
        isInitiator: isInitiator(userId, peerId),
        remoteStream: null,
      };
      peersRef.current.set(peerId, state);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const remoteStream =
          event.streams[0] ?? new MediaStream([event.track]);
        state.remoteStream = remoteStream;
        syncRemoteStreamsState();
        const el = remoteVideoRefs.current.get(peerId);
        if (el) void bindVideoElement(el, remoteStream, true);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal(peerId, {
            type: "ice",
            candidate: event.candidate.toJSON(),
          });
        }
      };

      await sendSignal(peerId, { type: "ready" });
      if (state.isInitiator) {
        await new Promise((r) => setTimeout(r, 350));
        if (!cancelled) await sendOffer(peerId, state);
      }
    }

    async function start() {
      setMediaError(null);
      teardownAll();

      try {
        const stream = await ensureLocalStream();
        if (cancelled) return;

        const supabase = createClient();
        const channel = supabase.channel(`party-webrtc:${partyId}`, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        channel.on(
          "broadcast",
          { event: "party-webrtc-signal" },
          async ({ payload }) => {
            await handleSignal(payload as SignalMessage);
          }
        );

        await channel.subscribe();
        if (cancelled) return;

        for (const peerId of sortedPeerIds) {
          if (peerId === userId) continue;
          await connectPeer(peerId, stream);
        }
      } catch (err) {
        if (!cancelled) {
          setVideoEnabled(false);
          setMediaError(mediaErrorMessage(err));
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      teardownAll();
    };
  }, [active, partyId, userId, sortedPeerIds.join(","), mediaRetryKey, syncRemoteStreamsState, stopMedia, teardownAll, teardownPeer]);

  return {
    attachLocalVideo: bindLocalPreview,
    registerRemoteVideo,
    remoteStreams,
    mediaError,
    videoEnabled,
    audioEnabled,
    toggleVideo,
    toggleAudio,
    stopMedia,
    retryMedia,
  };
}
