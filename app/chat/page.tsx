"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getMatchPrefs,
} from "@/lib/match-prefs";
import { randomIceBreaker } from "@/lib/ice-breakers";
import { useWebRTC } from "@/lib/webrtc/useWebRTC";
import { VideoPanel } from "./video-panel";
import { useAuth } from "@/components/AuthProvider";
import { FriendsPanel } from "@/components/FriendsPanel";
import { SafetyActions } from "@/components/SafetyActions";
import { MatchingWaitScreen } from "@/components/MatchingWaitScreen";
import { OnboardingTour } from "@/components/OnboardingTour";
import { ParticleBackground } from "@/components/ParticleBackground";
import { MatchCountdown } from "@/components/MatchCountdown";
import { ConnectionCardOverlay } from "@/components/ConnectionCardOverlay";
import { PostChatFeedback } from "@/components/PostChatFeedback";
import { RulesReminder } from "@/components/RulesReminder";
import { isOrientationProfileComplete, isArenaProfileComplete } from "@/lib/profile-orientation";
import { formatPartnerLine } from "@/lib/profile-age";
import { isAgeVerified, syncProfileAgeVerified } from "@/lib/age-gate";
import { useTypingIndicator } from "@/lib/hooks/useTypingIndicator";
import { useMatchCelebration } from "@/lib/hooks/useMatchCelebration";
import { countryCodeToFlag } from "@/lib/flags";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

type Message = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

function appendMessage(list: Message[], msg: Message): Message[] {
  if (list.some((m) => m.id === msg.id)) return list;
  return [...list, msg];
}

export default function ChatPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const userId = profile?.id ?? "";
  const [roomId, setRoomId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "matching" | "connected" | "disconnected" | "restricted"
  >("matching");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingNext, setLoadingNext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIceBreakerPopup, setShowIceBreakerPopup] = useState(false);
  const [iceBreakerQuestion, setIceBreakerQuestion] = useState("");
  const [friendId, setFriendId] = useState<string | null>(null);
  const [friendUsername, setFriendUsername] = useState("");
  const [friendsMatched, setFriendsMatched] = useState(false);
  const [connectNotice, setConnectNotice] = useState<string | null>(null);
  const [youClickedConnect, setYouClickedConnect] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [bothRevealed, setBothRevealed] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerLabel, setPartnerLabel] = useState<string | null>(null);
  const [sharedTags, setSharedTags] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRoomId, setFeedbackRoomId] = useState<string | null>(null);
  const [feedbackPartnerId, setFeedbackPartnerId] = useState<string | null>(null);
  const [pendingNext, setPendingNext] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const videoBlurred = profile?.face_blur_default ?? true;
  const voiceOnly = profile?.voice_only_default ?? false;
  const seasonal = getSeasonalTheme();

  const {
    countdown,
    showCard,
    cardData,
    dismissCard,
    celebrate,
    resetCelebration,
    playMessageSound,
    playNextSound,
  } = useMatchCelebration();

  const partnerTyping = useTypingIndicator(
    roomId,
    userId,
    input,
    status === "connected"
  );

  const webrtcActive = status === "connected" && !!roomId;
  const {
    localVideoRef,
    remoteVideoRef,
    mediaError,
    videoEnabled,
    audioEnabled,
    toggleVideo,
    toggleAudio,
    stopMedia,
    connectionState,
  } = useWebRTC(roomId, userId, webrtcActive, voiceOnly);

  useEffect(() => {
    if (status === "connected" && roomId) {
      celebrate(roomId);
      fetch(`/api/room/partner?roomId=${encodeURIComponent(roomId)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.partnerId) setPartnerId(d.partnerId);
          if (d.sharedTags) setSharedTags(d.sharedTags);
          if (d.partnerUsername) {
            setPartnerLabel(
              formatPartnerLine(d.partnerUsername, d.partnerAge, true)
            );
            setFriendUsername(d.partnerUsername);
          }
        })
        .catch(() => {});
    }
  }, [status, roomId, celebrate]);

  useEffect(() => {
    if (status === "matching") {
      resetCelebration();
      setPartnerId(null);
      setPartnerLabel(null);
      setSharedTags([]);
    }
  }, [status, resetCelebration]);

  const matchPrefs = getMatchPrefs();
  const roomBadge =
    matchPrefs.matchMode === "regional"
      ? `REGIONAL · ${matchPrefs.countryCode}`
      : "GLOBAL ROOM";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/chat");
      return;
    }
    if (profile && !isArenaProfileComplete(profile)) {
      router.replace("/onboarding?next=/chat");
      return;
    }
    if (user && profile && !profile.age_verified) {
      if (isAgeVerified()) {
        void (async () => {
          const synced = await syncProfileAgeVerified();
          if (synced) {
            await refreshProfile();
            setError(null);
          } else {
            setError(
              "Age verification did not save. Go to the home page, confirm 18+ again, then refresh."
            );
          }
        })();
        return;
      }
      setError(
        "Confirm you are 18+ on the age verification screen first, then return to chat."
      );
    }
  }, [authLoading, user, profile, router, refreshProfile]);

  useEffect(() => {
    if (!userId) return;

    async function pingPresence() {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inQueue: status === "matching",
            inChat: status === "connected",
          }),
        });
      } catch {
        // ignore
      }
    }

    pingPresence();
    const interval = setInterval(pingPresence, 30000);
    return () => clearInterval(interval);
  }, [userId, status]);

  useEffect(() => {
    if (!roomId || status !== "connected" || !videoBlurred) {
      setBothRevealed(false);
      return;
    }

    async function checkConsent() {
      try {
        const res = await fetch(
          `/api/video-consent?roomId=${encodeURIComponent(roomId!)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (res.ok) setBothRevealed(Boolean(data.bothRevealed));
      } catch {
        // ignore
      }
    }

    checkConsent();
    const interval = setInterval(checkConsent, 3000);
    return () => clearInterval(interval);
  }, [roomId, status, videoBlurred]);

  async function handleRevealVideo() {
    if (!roomId) return;
    const res = await fetch("/api/video-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    const data = await res.json();
    if (res.ok) setBothRevealed(Boolean(data.bothRevealed));
  }

  const refreshConnectStatus = useCallback(async () => {
    if (!roomId || !userId) return;

    try {
      const res = await fetch(
        `/api/friends/connect?roomId=${encodeURIComponent(roomId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) return;

      setYouClickedConnect(data.youClicked);
      if (data.matched && data.partnerProfileId) {
        setFriendsMatched(true);
        setFriendId(data.partnerProfileId);
        if (data.partnerUsername) {
          setFriendUsername(data.partnerUsername);
        }
      }
    } catch {
      // retry on next poll
    }
  }, [roomId, userId]);

  useEffect(() => {
    if (!roomId || status !== "connected" || !userId) return;

    refreshConnectStatus();
    const interval = setInterval(refreshConnectStatus, 2000);

    const supabase = createClient();
    const channel = supabase
      .channel(`connect:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_connect_clicks",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          refreshConnectStatus();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [roomId, status, userId, refreshConnectStatus]);

  useEffect(() => {
    if (!userId || authLoading || !profile?.age_verified) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;

    async function tryMatch() {
      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchMode: getMatchPrefs().matchMode,
            countryCode: getMatchPrefs().countryCode,
          }),
          cache: "no-store",
        });
        const text = await res.text();
        if (cancelled) return;

        if (!text) {
          setError(
            "Server returned empty response. Restart npm run dev, or redeploy on Vercel if this is lovarena.app."
          );
          return;
        }

        const data = JSON.parse(text);
        if (!res.ok || data.error) {
          if (data.needsAuth) {
            router.replace("/login?next=/chat");
            return;
          }
          if (data.flagged) {
            setStatus("restricted");
            clearInterval(interval);
          }
          setError(data.error ?? `Match failed (${res.status})`);
          return;
        }

        setError(null);
        if (data.roomId) {
          setRoomId(data.roomId);
          setStatus("connected");
          clearInterval(interval);
        }
      } catch {
        if (!cancelled) setError("Could not reach /api/match. Is npm run dev running?");
      }
    }

    tryMatch();
    interval = setInterval(tryMatch, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, authLoading, profile?.age_verified]);

  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();

    async function loadMessages() {
      try {
        const res = await fetch(`/api/messages?roomId=${roomId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && data.messages) {
          setMessages(data.messages);
        }
      } catch {
        // polling will retry
      }
    }

    loadMessages();
    const poll = setInterval(loadMessages, 2000);

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => appendMessage(prev, msg));
          if (msg.sender_id !== userId) playMessageSound();
        }
      )
      .subscribe();

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || status !== "connected") return;

    async function checkRoom() {
      try {
        const res = await fetch(`/api/room?roomId=${roomId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && data.status === "ended") {
          setStatus("disconnected");
        }
      } catch {
        // retry on next poll
      }
    }

    checkRoom();
    const interval = setInterval(checkRoom, 2000);
    return () => clearInterval(interval);
  }, [roomId, status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !roomId || !userId) return;

    const text = input.trim();
    setInput("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, content: text }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        if (data.violation && data.sessionTerminated) {
          stopMedia();
          setStatus("restricted");
          setRoomId(null);
          setError(data.error);
          return;
        }
        setError(data.error ?? "Failed to send message");
        setInput(text);
        return;
      }

      if (data.message) {
        setMessages((prev) => appendMessage(prev, data.message as Message));
        if (data.message.sender_id !== userId) playMessageSound();
      }
    } catch {
      setError("Failed to send message. Check npm run dev.");
      setInput(text);
    }
  }

  function promptFeedback(prevRoomId: string | null, prevPartnerId: string | null) {
    if (prevRoomId && prevPartnerId) {
      setFeedbackRoomId(prevRoomId);
      setFeedbackPartnerId(prevPartnerId);
      setShowFeedback(true);
      setPendingNext(true);
      return true;
    }
    return false;
  }

  async function handleNext() {
    if (!userId || loadingNext) return;
    if (showFeedback) return;

    if (roomId && partnerId && promptFeedback(roomId, partnerId)) {
      return;
    }

    await doNext();
  }

  async function doNext() {
    if (!userId || loadingNext) return;
    playNextSound();
    stopMedia();
    setLoadingNext(true);
    setMessages([]);
    const previousRoomId = roomId;
    setRoomId(null);
    setPartnerId(null);
    setSharedTags([]);
    resetCelebration();
    setStatus("matching");

    const res = await fetch("/api/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: previousRoomId,
        matchMode: getMatchPrefs().matchMode,
        countryCode: getMatchPrefs().countryCode,
      }),
    });
    const data = await res.json();

    if (data.roomId) {
      setRoomId(data.roomId);
      setStatus("connected");
      setLoadingNext(false);
      return;
    }

    setLoadingNext(false);

    const poll = setInterval(async () => {
      const r = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchMode: getMatchPrefs().matchMode,
          countryCode: getMatchPrefs().countryCode,
        }),
      });
      const d = await r.json();
      if (d.roomId) {
        setRoomId(d.roomId);
        setStatus("connected");
        clearInterval(poll);
      }
    }, 2000);
  }

  function generateIceBreaker() {
    setIceBreakerQuestion(randomIceBreaker());
    setShowIceBreakerPopup(true);
  }

  function useIceBreakerQuestion() {
    setInput(iceBreakerQuestion);
    setShowIceBreakerPopup(false);
  }

  async function handleConnect() {
    if (!roomId || !userId) return;

    if (!user) {
      router.push("/login?next=/chat");
      return;
    }

    setConnectLoading(true);
    setConnectNotice(null);

    try {
      const res = await fetch("/api/friends/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();

      if (data.needsAuth || res.status === 401) {
        router.push("/login?next=/chat");
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Could not connect");
        return;
      }

      setYouClickedConnect(true);

      if (data.matched && data.partnerProfileId) {
        setFriendsMatched(true);
        setFriendId(data.partnerProfileId);
        setFriendUsername(data.partnerUsername ?? "Friend");
        setConnectNotice("Matched! Added to Friends");
        setTimeout(() => setConnectNotice(null), 5000);
      } else {
        setConnectNotice("Waiting for them to ❤️ Connect too…");
      }
    } catch {
      setError("Connect failed. Try again.");
    } finally {
      setConnectLoading(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row w-full bg-gradient-to-br ${seasonal.gradient} text-white relative`}>
    <ParticleBackground />
    <main className="flex-1 flex flex-col min-w-0 w-full max-w-4xl mx-auto lg:mx-0 relative z-[1]">
      <header className="flex items-center justify-between px-4 py-3 gap-2 text-sm">
        <Link href="/" className="text-slate-400 hover:text-white shrink-0 text-xs">
          ← Home
        </Link>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "connected"
                ? "bg-emerald-400"
                : status === "matching"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-400"
            }`}
          />
          {status === "matching" && "Looking for someone…"}
          {status === "connected" &&
            (partnerLabel ? `Connected · ${partnerLabel}` : "Connected")}
          {status === "disconnected" && "Stranger left"}
          {status === "restricted" && "Restricted"}
        </div>
        {profile && (
          <Link
            href="/profile"
            className="text-[10px] text-purple-300 hover:text-fuchsia-300 truncate hidden sm:block transition"
          >
            {profile.username}
          </Link>
        )}
      </header>

      {status !== "restricted" && (
        <>
        <MatchingWaitScreen visible={status === "matching"} />
        <VideoPanel
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          mediaError={mediaError}
          connectionState={connectionState}
          status={status}
          matchBadge={roomBadge}
          videoEnabled={videoEnabled}
          audioEnabled={audioEnabled}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onStop={stopMedia}
          onNext={handleNext}
          onIceBreaker={generateIceBreaker}
          loadingNext={loadingNext}
          showConnect={status === "connected"}
          videoBlurred={videoBlurred}
          bothRevealed={bothRevealed}
          onRevealVideo={handleRevealVideo}
          strangerFlag={
            matchPrefs.matchMode === "regional"
              ? countryCodeToFlag(matchPrefs.countryCode)
              : undefined
          }
          sharedTags={sharedTags}
          voiceOnly={voiceOnly}
          connectSlot={
            <>
              <button
                type="button"
                onClick={handleConnect}
                disabled={connectLoading || friendsMatched}
                className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 text-white font-bold text-sm px-5 py-3 rounded-2xl transition shadow-lg shadow-pink-500/30"
              >
                {friendsMatched
                  ? "❤️ Friends"
                  : youClickedConnect
                    ? "❤️ Waiting…"
                    : "❤️ Connect"}
              </button>
              {roomId && (
                <SafetyActions
                  roomId={roomId}
                  onBlocked={() => {
                    stopMedia();
                    setRoomId(null);
                    setStatus("disconnected");
                    setError("User blocked. Press Next for a new match.");
                  }}
                />
              )}
            </>
          }
        />
        </>
      )}

      <OnboardingTour />

      <MatchCountdown countdown={countdown} visible={countdown !== null} />
      <ConnectionCardOverlay
        data={cardData}
        visible={showCard}
        onDone={dismissCard}
      />
      <PostChatFeedback
        roomId={feedbackRoomId ?? ""}
        partnerId={feedbackPartnerId ?? ""}
        visible={showFeedback}
        onClose={() => {
          setShowFeedback(false);
          if (pendingNext) {
            setPendingNext(false);
            void doNext();
          }
        }}
      />

      {connectNotice && (
        <div className="mx-4 mb-3 rounded-xl border border-pink-500/40 bg-pink-500/15 px-4 py-3 text-sm text-pink-200 text-center animate-fade-in">
          {connectNotice}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-[100px] max-w-4xl w-full mx-auto">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
            {status !== "restricted" &&
              !error.includes("18+") &&
              !error.includes("Age verification") && (
              <p className="mt-2 text-xs text-red-400/80">
                Local: run <code className="text-red-300">npm run dev</code> and
                check <code className="text-red-300">.env.local</code>. Supabase:
                run{" "}
                <code className="text-red-300">supabase/fix-function-missing.sql</code>{" "}
                (not full schema.sql). Production: add Supabase keys in Vercel →
                Environment Variables, then redeploy.
              </p>
            )}
          </div>
        )}
        {status === "restricted" && !error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Your session was restricted for violating community guidelines. You
            cannot send messages or match again from this browser tab.
          </div>
        )}
        {status === "disconnected" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Stranger disconnected. Press <strong>Next</strong> to find someone
            new.
          </div>
        )}
        {status === "matching" && messages.length === 0 && !error && (
          <p className="text-center text-slate-500 mt-20">
            Waiting for a stranger to join...
            <br />
            <span className="text-sm">
              Open another tab or incognito window to test with yourself.
            </span>
          </p>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === userId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isMe
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                    : "bg-white/10 text-slate-100"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="p-4 border-t border-purple-500/20 space-y-3 max-w-4xl w-full mx-auto"
      >
        {partnerTyping && (
          <p className="text-center text-xs text-fuchsia-300/80 pb-2 animate-pulse">
            Stranger is typing…
          </p>
        )}

        <RulesReminder />

        <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "connected"}
          placeholder={
            status === "connected"
              ? "Type a message..."
              : status === "disconnected"
                ? "Stranger left — press Next"
                : "Waiting for match..."
          }
          className="flex-1 rounded-xl bg-slate-950/60 border border-purple-500/20 px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50 disabled:opacity-50 text-white"
        />
        <button
          type="submit"
          disabled={status !== "connected" || !input.trim()}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
        >
          Send
        </button>
        </div>
      </form>

      {showIceBreakerPopup && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
          <div
            className="bg-slate-900 border-2 border-fuchsia-500 p-8 rounded-3xl max-w-sm w-full text-center shadow-[0_0_40px_rgba(217,70,239,0.3)] transform scale-100 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-3 animate-pulse">🔮</div>
            <h3 className="text-fuchsia-400 font-extrabold text-xl tracking-wide mb-4">
              Break the Ice!
            </h3>
            <p className="text-slate-100 text-base md:text-lg font-medium italic leading-relaxed mb-6 px-1">
              &ldquo;{iceBreakerQuestion}&rdquo;
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={useIceBreakerQuestion}
                className="bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-bold py-2.5 px-4 rounded-xl text-sm tracking-wider transition"
              >
                Send to chat
              </button>
              <button
                type="button"
                onClick={generateIceBreaker}
                className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-cyan-400 font-bold py-2.5 px-4 rounded-xl border border-cyan-400/20 text-xs tracking-wider transition"
              >
                🎲 Reroll Question
              </button>
              <button
                type="button"
                onClick={() => setShowIceBreakerPopup(false)}
                className="text-slate-400 hover:text-rose-400 transition-colors text-xs font-bold pt-2 uppercase tracking-widest"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </main>

    {friendsMatched && friendId && profile && (
      <FriendsPanel
        friendId={friendId}
        friendUsername={friendUsername || "Friend"}
        myId={profile.id}
      />
    )}
    </div>
  );
}
