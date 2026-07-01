import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  acquireCameraTrack,
  acquireLocalMedia,
  mediaErrorMessage,
} from "@/lib/webrtc/media-constraints";
import {
  buildPeerConnectionConfig,
  resolveWebRtcConfig,
  sanitizeIceCandidate,
  sanitizeSdp,
} from "@/lib/webrtc/webrtc-config";

type SignalOut =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "ready" };

type SignalMessage = SignalOut & { from: string };

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

async function refreshLocalVideoElement(
  el: HTMLVideoElement | null,
  stream: MediaStream | null
) {
  if (!el || !stream) return;
  if (el.srcObject !== stream) {
    el.srcObject = stream;
  }
  applyLocalVideoAttrs(el);

  const tryPlay = () => {
    void el.play().catch(() => {});
  };

  el.onloadeddata = tryPlay;
  tryPlay();
  requestAnimationFrame(tryPlay);
}

async function refreshRemoteVideoElement(
  el: HTMLVideoElement | null,
  stream: MediaStream | null
) {
  if (!el || !stream) return;
  if (el.srcObject !== stream) {
    el.srcObject = stream;
  }
  applyRemoteVideoAttrs(el);

  const tryPlay = () => {
    void el.play().catch(() => {});
  };

  el.onloadeddata = tryPlay;
  tryPlay();
  requestAnimationFrame(tryPlay);
}

function hasLiveVideoTrack(stream: MediaStream | null, voiceOnly: boolean) {
  if (voiceOnly) return false;
  const track = stream?.getVideoTracks()[0];
  return Boolean(track && track.readyState === "live");
}

export function useWebRTC(
  roomId: string | null,
  userId: string,
  active: boolean,
  voiceOnly = false,
  prefetchedStreamRef?: MutableRefObject<MediaStream | null>
) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const isInitiatorRef = useRef(false);
  const voiceOnlyRef = useRef(voiceOnly);
  const togglingVideoRef = useRef(false);
  const forceNewStreamRef = useRef(false);
  const wasActiveRef = useRef(false);
  const offerRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const relayOnlyRef = useRef(false);

  const [mediaError, setMediaError] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState<string>("new");
  const [mediaRetryKey, setMediaRetryKey] = useState(0);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    voiceOnlyRef.current = voiceOnly;
  }, [voiceOnly]);

  const bindLocalPreview = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    const stream = localStreamRef.current;
    if (el && stream) {
      void refreshLocalVideoElement(el, stream);
    }
  }, []);

  const retryMedia = useCallback(() => {
    forceNewStreamRef.current = true;
    setMediaRetryKey((k) => k + 1);
  }, []);

  const stopLocalTracks = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const clearOfferRetry = useCallback(() => {
    if (offerRetryRef.current) {
      clearInterval(offerRetryRef.current);
      offerRetryRef.current = null;
    }
  }, []);

  const teardownPeerConnection = useCallback(() => {
    clearOfferRetry();
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    iceQueueRef.current = [];
    setConnectionState("closed");
  }, [clearOfferRetry]);

  async function replaceVideoTrack(newTrack: MediaStreamTrack) {
    const stream = localStreamRef.current;
    const pc = pcRef.current;
    if (!stream) return;

    const oldTrack = stream.getVideoTracks()[0];
    if (oldTrack && oldTrack !== newTrack) {
      stream.removeTrack(oldTrack);
      oldTrack.stop();
    }
    if (!stream.getVideoTracks().includes(newTrack)) {
      stream.addTrack(newTrack);
    }

    const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
    if (sender) {
      await sender.replaceTrack(newTrack);
    } else if (pc) {
      pc.addTrack(newTrack, stream);
    }

    newTrack.enabled = true;
    setVideoEnabled(true);
    setMediaError(null);
    setPreviewKey((k) => k + 1);
    await refreshLocalVideoElement(localVideoRef.current, stream);
  }

  async function flushIceQueue(pc: RTCPeerConnection) {
    while (iceQueueRef.current.length > 0) {
      const candidate = iceQueueRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          // ignore stale candidates
        }
      }
    }
  }

  async function sendSignal(payload: SignalOut) {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({
      type: "broadcast",
      event: "webrtc-signal",
      payload: { ...payload, from: userId },
    });
  }

  async function sendOffer() {
    const pc = pcRef.current;
    if (!pc || !isInitiatorRef.current) return;

    try {
      if (pc.signalingState === "have-local-offer" && pc.localDescription?.sdp) {
        await sendSignal({ type: "offer", sdp: sanitizeSdp(pc.localDescription.sdp, relayOnlyRef.current) });
        return;
      }

      if (pc.signalingState !== "stable" && pc.signalingState !== "closed") {
        return;
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (offer.sdp) {
        await sendSignal({
          type: "offer",
          sdp: sanitizeSdp(offer.sdp, relayOnlyRef.current),
        });
      }
    } catch {
      // offer can race during rapid reconnects
    }
  }

  async function ensureLocalStream(): Promise<MediaStream> {
    const needsFreshStream =
      forceNewStreamRef.current ||
      !hasLiveVideoTrack(localStreamRef.current, voiceOnly);

    if (!needsFreshStream && localStreamRef.current) {
      return localStreamRef.current;
    }

    forceNewStreamRef.current = false;
    stopLocalTracks();

    let stream = prefetchedStreamRef?.current ?? null;
    if (stream) {
      prefetchedStreamRef!.current = null;
    } else {
      stream = await acquireLocalMedia(voiceOnly);
    }

    if (!stream) {
      throw new DOMException(
        "Could not open camera or microphone.",
        "NotReadableError"
      );
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = true;
    }

    localStreamRef.current = stream;
    setVideoEnabled(hasLiveVideoTrack(stream, voiceOnly));
    setAudioEnabled(Boolean(stream.getAudioTracks()[0]?.enabled ?? true));
    setPreviewKey((k) => k + 1);
    await refreshLocalVideoElement(localVideoRef.current, stream);
    return stream;
  }

  const stopMedia = useCallback(() => {
    stopLocalTracks();
    teardownPeerConnection();
    setVideoEnabled(false);
    setAudioEnabled(false);
  }, [stopLocalTracks, teardownPeerConnection]);

  const toggleVideo = useCallback(async () => {
    if (voiceOnlyRef.current || togglingVideoRef.current) return;

    togglingVideoRef.current = true;

    try {
      let stream = localStreamRef.current;
      if (!stream) {
        if (!active) return;
        stream = await ensureLocalStream();
      }

      const track = stream.getVideoTracks()[0];
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
        await refreshLocalVideoElement(localVideoRef.current, stream);
      }
    } catch (err) {
      setMediaError(mediaErrorMessage(err));
    } finally {
      togglingVideoRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- WebRTC stream lifecycle
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
      void refreshLocalVideoElement(localVideoRef.current, stream);
    }
  }, [active, videoEnabled, previewKey]);

  useEffect(() => {
    if (!active) {
      if (wasActiveRef.current) {
        stopMedia();
      }
      wasActiveRef.current = false;
      return;
    }

    wasActiveRef.current = true;

    if (!roomId || !userId) return;

    let cancelled = false;

    async function handleSignal(msg: SignalMessage) {
      if (!msg?.from || msg.from === userId) return;
      const peer = pcRef.current;
      if (!peer) return;

      try {
        if (msg.type === "ready") {
          if (isInitiatorRef.current) {
            await sendOffer();
          } else {
            await sendSignal({ type: "ready" });
          }
          return;
        }

        if (msg.type === "offer" && !isInitiatorRef.current) {
          await peer.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: msg.sdp })
          );
          await flushIceQueue(peer);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          if (answer.sdp) {
            await sendSignal({
              type: "answer",
              sdp: sanitizeSdp(answer.sdp, relayOnlyRef.current),
            });
          }
          return;
        }

        if (msg.type === "answer" && isInitiatorRef.current) {
          if (peer.signalingState === "have-local-offer") {
            await peer.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp: msg.sdp })
            );
            await flushIceQueue(peer);
          }
          return;
        }

        if (msg.type === "ice") {
          const candidate = sanitizeIceCandidate(
            msg.candidate,
            relayOnlyRef.current
          );
          if (!candidate) return;
          if (peer.remoteDescription) {
            await peer.addIceCandidate(candidate);
          } else {
            iceQueueRef.current.push(candidate);
          }
        }
      } catch {
        // negotiation can race on fast reconnects
      }
    }

    async function start() {
      setMediaError(null);
      iceQueueRef.current = [];
      teardownPeerConnection();

      try {
        const stream = await ensureLocalStream();
        if (cancelled) return;

        const roomRes = await fetch(`/api/room?roomId=${roomId}`, {
          cache: "no-store",
        });
        const roomData = await roomRes.json();
        if (cancelled) return;

        isInitiatorRef.current = roomData.user1_id === userId;

        const rtcConfig = await resolveWebRtcConfig();
        relayOnlyRef.current = rtcConfig.relayOnly;

        const pc = new RTCPeerConnection(buildPeerConnectionConfig(rtcConfig));
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          const remoteStream =
            event.streams[0] ?? new MediaStream([event.track]);
          if (remoteVideoRef.current) {
            void refreshRemoteVideoElement(
              remoteVideoRef.current,
              remoteStream
            );
          }
        };

        pc.onicecandidate = (event) => {
          if (!event.candidate) return;
          const candidate = sanitizeIceCandidate(
            event.candidate.toJSON(),
            relayOnlyRef.current
          );
          if (!candidate) return;
          void sendSignal({ type: "ice", candidate });
        };

        pc.onconnectionstatechange = () => {
          setConnectionState(pc.connectionState);
          if (pc.connectionState === "connected") {
            clearOfferRetry();
          }
        };

        const supabase = createClient();
        const channel = supabase.channel(`webrtc:${roomId}`, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        channel.on(
          "broadcast",
          { event: "webrtc-signal" },
          async ({ payload }) => {
            await handleSignal(payload as SignalMessage);
          }
        );

        await channel.subscribe();
        if (cancelled || !pcRef.current) return;

        await sendSignal({ type: "ready" });

        if (isInitiatorRef.current) {
          await new Promise((r) => setTimeout(r, 400));
          if (cancelled || !pcRef.current) return;
          await sendOffer();

          clearOfferRetry();
          offerRetryRef.current = setInterval(() => {
            const current = pcRef.current;
            if (!current || current.connectionState === "connected") {
              clearOfferRetry();
              return;
            }
            void sendOffer();
          }, 3000);
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
      teardownPeerConnection();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- WebRTC reconnect lifecycle
  }, [
    active,
    roomId,
    userId,
    voiceOnly,
    mediaRetryKey,
    stopMedia,
    teardownPeerConnection,
    clearOfferRetry,
  ]);

  return {
    localVideoRef,
    attachLocalVideo: bindLocalPreview,
    remoteVideoRef,
    mediaError,
    videoEnabled,
    audioEnabled,
    toggleVideo,
    toggleAudio,
    stopMedia,
    retryMedia,
    connectionState,
  };
}
