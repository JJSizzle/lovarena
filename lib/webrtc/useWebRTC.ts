import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getIceServers } from "@/lib/webrtc/ice-servers";

type SignalOut =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice"; candidate: RTCIceCandidateInit };

type SignalMessage = SignalOut & { from: string };

function applyIosVideoAttrs(el: HTMLVideoElement | null) {
  if (!el) return;
  el.playsInline = true;
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
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

export function useWebRTC(
  roomId: string | null,
  userId: string,
  active: boolean,
  voiceOnly = false
) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const isInitiatorRef = useRef(false);

  const [mediaError, setMediaError] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState<string>("new");

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

  function toggleVideo() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !videoEnabled;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setVideoEnabled(next);
  }

  function toggleAudio() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !audioEnabled;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    setAudioEnabled(next);
  }

  useEffect(() => {
    if (!active || !roomId || !userId) return;

    let cancelled = false;

    async function start() {
      setMediaError(null);
      iceQueueRef.current = [];

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: voiceOnly
            ? false
            : {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 },
              },
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
        setVideoEnabled(!voiceOnly);
        setAudioEnabled(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          applyIosVideoAttrs(localVideoRef.current);
        }

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
          // Brief delay so the peer can subscribe to the signaling channel
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
