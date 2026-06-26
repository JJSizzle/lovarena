import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SignalOut =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice"; candidate: RTCIceCandidateInit };

type SignalMessage = SignalOut & { from: string };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useWebRTC(
  roomId: string | null,
  userId: string,
  active: boolean
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

  function stopMedia() {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    pcRef.current?.close();
    pcRef.current = null;
    setVideoEnabled(false);
    setConnectionState("closed");
  }

  function toggleVideo() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !videoEnabled;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setVideoEnabled(next);
  }

  useEffect(() => {
    if (!active || !roomId || !userId) return;

    let cancelled = false;

    async function start() {
      setMediaError(null);
      iceQueueRef.current = [];

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setVideoEnabled(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const roomRes = await fetch(`/api/room?roomId=${roomId}`, {
          cache: "no-store",
        });
        const roomData = await roomRes.json();
        if (cancelled) return;

        isInitiatorRef.current = roomData.user1_id === userId;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
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
          const message =
            err instanceof Error ? err.message : "Camera/mic access failed";
          setMediaError(message);
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
  }, [active, roomId, userId]);

  return {
    localVideoRef,
    remoteVideoRef,
    mediaError,
    videoEnabled,
    toggleVideo,
    stopMedia,
    connectionState,
  };
}
