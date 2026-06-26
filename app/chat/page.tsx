"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getMatchPrefs,
  matchModeLabel,
} from "@/lib/match-prefs";
import { randomIceBreaker } from "@/lib/ice-breakers";
import { useWebRTC } from "@/lib/webrtc/useWebRTC";
import { VideoPanel } from "./video-panel";
import { useAuth } from "@/components/AuthProvider";
import { FriendsPanel } from "@/components/FriendsPanel";
import { SafetyActions } from "@/components/SafetyActions";
import { isOrientationProfileComplete } from "@/lib/profile-orientation";

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
  const { user, profile, loading: authLoading } = useAuth();
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const webrtcActive = status === "connected" && !!roomId;
  const {
    localVideoRef,
    remoteVideoRef,
    mediaError,
    videoEnabled,
    toggleVideo,
    stopMedia,
    connectionState,
  } = useWebRTC(roomId, userId, webrtcActive);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/chat");
      return;
    }
    if (profile && !isOrientationProfileComplete(profile)) {
      router.replace("/onboarding?next=/chat");
      return;
    }
    if (user && profile && !profile.age_verified) {
      setError(
        "Confirm you are 18+ on the age verification screen, then refresh."
      );
    }
  }, [authLoading, user, profile, router]);

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
    const poll = setInterval(loadMessages, 3000);

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
          setMessages((prev) => appendMessage(prev, payload.new as Message));
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
      }
    } catch {
      setError("Failed to send message. Check npm run dev.");
      setInput(text);
    }
  }

  async function handleNext() {
    if (!userId || loadingNext) return;
    stopMedia();
    setLoadingNext(true);
    setMessages([]);
    const previousRoomId = roomId;
    setRoomId(null);
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
    <div className="min-h-screen flex flex-col lg:flex-row w-full max-w-5xl mx-auto bg-slate-950 text-white">
    <main className="flex-1 flex flex-col min-w-0 min-h-screen w-full max-w-2xl mx-auto lg:mx-0">
      <header className="flex items-center justify-between px-4 py-4 border-b border-white/10 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="text-sm text-slate-400 hover:text-white shrink-0">
            Lovarena
          </Link>
          {user && profile ? (
            <span className="text-[10px] text-slate-500 truncate hidden sm:block">
              {profile.username}
            </span>
          ) : (
            <Link
              href="/login?next=/chat"
              className="text-xs text-sky-400 hover:text-sky-300 shrink-0"
            >
              Sign in
            </Link>
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5 text-sm">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                status === "connected"
                  ? "bg-emerald-400"
                  : status === "matching"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-red-400"
              }`}
            />
            {status === "matching" && "Looking for someone..."}
            {status === "connected" && "Connected to stranger"}
            {status === "disconnected" && "Stranger left"}
            {status === "restricted" && "Session restricted"}
          </div>
          <span className="text-[10px] text-slate-500">
            {matchModeLabel(getMatchPrefs().matchMode)}
            {getMatchPrefs().matchMode === "regional" &&
              ` · ${getMatchPrefs().countryCode}`}
          </span>
        </div>
        {roomId && status === "connected" && (
          <span className="text-[10px] text-slate-600 font-mono">
            room {roomId.slice(0, 8)}
          </span>
        )}
        <button
          onClick={handleNext}
          disabled={loadingNext || status === "restricted"}
          className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Next
        </button>
      </header>

      <VideoPanel
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        mediaError={mediaError}
        connectionState={connectionState}
        visible={status === "connected"}
      />

      {connectNotice && (
        <div className="mx-4 mt-3 rounded-xl border border-pink-500/40 bg-pink-500/15 px-4 py-3 text-sm text-pink-200 text-center animate-fade-in">
          {connectNotice}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[120px]">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
            {status !== "restricted" && (
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
        className="p-4 border-t border-white/10 space-y-3"
      >
        {status === "connected" && (
          <div className="flex flex-wrap items-center justify-center gap-2 bg-white/5 backdrop-blur px-4 py-3 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={handleConnect}
              disabled={connectLoading || friendsMatched}
              className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm shadow-md shadow-pink-600/20"
            >
              {friendsMatched
                ? "❤️ Friends"
                : youClickedConnect
                  ? "❤️ Waiting…"
                  : "❤️ Connect"}
            </button>
            <button
              type="button"
              onClick={stopMedia}
              className="bg-red-600/90 hover:bg-red-600 text-white font-medium px-4 py-2.5 rounded-xl transition text-sm"
            >
              Stop cam
            </button>
            <button
              type="button"
              onClick={generateIceBreaker}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-md shadow-indigo-600/20"
            >
              Ice Breaker
            </button>
            <button
              type="button"
              onClick={toggleVideo}
              className="bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2.5 rounded-xl transition text-sm"
            >
              {videoEnabled ? "Hide cam" : "Show cam"}
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
          </div>
        )}
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
          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-violet-500 disabled:opacity-50 text-white"
        />
        <button
          type="submit"
          disabled={status !== "connected" || !input.trim()}
          className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
        >
          Send
        </button>
        </div>
      </form>

      {showIceBreakerPopup && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setShowIceBreakerPopup(false)}
        >
          <div
            className="bg-slate-900 border border-indigo-500/30 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-indigo-400 font-bold text-lg mb-3">
              Ask the stranger:
            </h3>
            <p className="text-slate-200 text-base italic mb-6 px-2">
              &ldquo;{iceBreakerQuestion}&rdquo;
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={useIceBreakerQuestion}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl transition text-sm"
              >
                Use this question
              </button>
              <button
                type="button"
                onClick={generateIceBreaker}
                className="bg-white/10 hover:bg-white/15 text-white font-medium py-2 px-4 rounded-xl transition text-sm"
              >
                Give me another one
              </button>
              <button
                type="button"
                onClick={() => setShowIceBreakerPopup(false)}
                className="text-slate-400 hover:text-white transition text-xs pt-2"
              >
                Close
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
