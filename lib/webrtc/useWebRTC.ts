import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getIceServers } from "@/lib/webrtc/ice-servers";

type SignalOut =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice"; candidate: RTCIceCandidateInit };

type SignalMessage = SignalOut & { from: string };

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 640 },
  height: { ideal: 480 },
};

function applyIosVideoAttrs(el: HTMLVideoElement | null) {
  if (!el) return;
  el.playsInline = true;
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  el.muted = true;
}

function mediaErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Camera/mic permission denied. Allow access in browser settings or continue with text only.";
    }
    if (err.name === "NotFoundError") {
      return "No camera or microphone found on this device.";
    }
    if (err.name === "NotReadableError") {
      return "Camera is in use by another app. Close other apps and try again.";
    }
  }
  return err instanceof Error ? err.message : "Camera/mic access failed";
}

function syncVideoEnabledFromStream(
  stream: MediaStream | null,
  setVideoEnabled: (enabled: boolean) => void
) {
  const track = stream?.getVideoTracks()[0];
  setVideoEnabled(Boolean(track?.enabled && track.readyState === "live"));
}

async function refreshLocalVideoElement(
  el: HTMLVideoElement | null,
  stream: MediaStream | null
) {
  if (!el || !stream) return;
  if (el.srcObject !== stream) {
    el.srcObject = stream;
  }
  applyIosVideoAttrs(el);
  try {
    await el.play();
  } catch {
    // autoplay policies — preview may resume on next frame
  }
}

export function useWebRTC(
  roomId: string | null,
  userId: string,
  active: boolean,
  voiceOnly = false
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

  const [mediaError, setMediaError] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState<string>("new");

  voiceOnlyRef.current = voiceOnly;

  const bindLocalPreview = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    const stream = localStreamRef.current;
    if (!el || !stream) return;
    syncVideoEnabledFromStream(stream, setVideoEnabled);
    void refreshLocalVideoElement(el, stream);
  }, []);

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
    await refreshLocalVideoElement(localVideoRef.current, stream);
  }

  async function acquireVideoTrack(): Promise<MediaStreamTrack | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_CONSTRAINTS,
        audio: false,
      });
      const track = stream.getVideoTracks()[0] ?? null;
      stream.getAudioTracks().forEach((t) => t.stop());
      return track;
    } catch (err) {
      setMediaError(mediaErrorMessage(err));
      return null;
    }
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

  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    pcRef.current?.close();
    pcRef.current = null;
    setVideoEnabled(false);
    setAudioEnabled(false);
    setConnectionState("closed");
  }, []);

  const toggleVideo = useCallback(async () => {
    if (voiceOnlyRef.current) return;

    const stream = localStreamRef.current;
    if (!stream) return;

    let track = stream.getVideoTracks()[0];
    const turningOn = !track?.enabled;

    if (turningOn && (!track || track.readyState === "ended")) {
      const newTrack = await acquireVideoTrack();
      if (!newTrack) return;
      await replaceVideoTrack(newTrack);
      return;
    }

    if (!track) {
      const newTrack = await acquireVideoTrack();
      if (!newTrack) return;
      await replaceVideoTrack(newTrack);
      return;
    }

    track.enabled = turningOn;
    setVideoEnabled(turningOn);

    if (turningOn) {
      await refreshLocalVideoElement(localVideoRef.current, stream);
    }
  }, []);

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
    if (!active || !roomId || !userId) return;

    let cancelled = false;

    async function start() {
      setMediaError(null);
      iceQueueRef.current = [];

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: voiceOnly ? false : VIDEO_CONSTRAINTS,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setVideoEnabled(!voiceOnly && stream.getVideoTracks().length > 0);
        setAudioEnabled(true);
        await refreshLocalVideoElement(localVideoRef.current, stream);

        const roomRes = await fetch(`/api/room?roomId=${roomId}`, {
          cache: "no-store",
        });
        const roomData = await roomRes.json();
        if (cancelled) return;

        isInitiatorRef.current = roomData.user1_id === userId;

        const pc = new RTCPeerConnection({
          iceServers: getIceServers(),
          bundlePolicy: "max-bundle",
        });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            applyIosVideoAttrs(remoteVideoRef.current);
            void remoteVideoRef.current.play().catch(() => {});
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal({
              type: "ice",
              candidate: event.candidate.toJSON(),
            });
          }
        };

        pc.onconnectionstatechange = () => {
          setConnectionState(pc.connectionState);
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
            const msg = payload as SignalMessage;
            if (!msg?.from || msg.from === userId) return;
            const peer = pcRef.current;
            if (!peer) return;

            try {
              if (msg.type === "offer" && !isInitiatorRef.current) {
                await peer.setRemoteDescription(
                  new RTCSessionDescription({ type: "offer", sdp: msg.sdp })
                );
                await flushIceQueue(peer);
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                await sendSignal({ type: "answer", sdp: answer.sdp! });
              } else if (msg.type === "answer" && isInitiatorRef.current) {
                await peer.setRemoteDescription(
                  new RTCSessionDescription({ type: "answer", sdp: msg.sdp })
                );
                await flushIceQueue(peer);
              } else if (msg.type === "ice") {
                if (peer.remoteDescription) {
                  await peer.addIceCandidate(msg.candidate);
                } else {
                  iceQueueRef.current.push(msg.candidate);
                }
              }
            } catch {
              // negotiation can race on fast reconnects
            }
          }
        );

        await channel.subscribe();

        if (isInitiatorRef.current) {
          await new Promise((r) => setTimeout(r, 500));
          if (cancelled || !pcRef.current) return;

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal({ type: "offer", sdp: offer.sdp! });
        }
      } catch (err) {
        if (!cancelled) {
          setMediaError(mediaErrorMessage(err));
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      pcRef.current?.close();
      pcRef.current = null;
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      iceQueueRef.current = [];
      setConnectionState("closed");
    };
  }, [active, roomId, userId, voiceOnly]);

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
    connectionState,
  };
}
