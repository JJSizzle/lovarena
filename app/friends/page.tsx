"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { FriendsPanel } from "@/components/FriendsPanel";
import { ParticleBackground } from "@/components/ParticleBackground";
import { chatBtnGhost, chatBtnLove } from "@/lib/chat-buttons";
import { connectionTypeLabel } from "@/lib/friends/connection-type";
import type { FriendConnectionType } from "@/lib/friends/connection-type";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

type Friend = {
  id: string;
  username: string;
  avatar_url: string | null;
  reputation_score: number;
  connection_type: FriendConnectionType | null;
};

type IncomingRequest = Friend & {
  requested_at: string;
};

export default function FriendsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>(
    []
  );
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [requestLoading, setRequestLoading] = useState<string | null>(null);
  const [requestNotice, setRequestNotice] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    const res = await fetch("/api/friends", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return;
    setFriends(data.friends ?? []);
    setIncomingRequests(data.incomingRequests ?? []);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?next=/friends");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    loadFriends().catch(() => {});
  }, [user, loadFriends]);

  async function handleRequestAction(
    requesterId: string,
    action: "accept" | "decline"
  ) {
    setRequestLoading(requesterId);
    setRequestNotice(null);
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId: requesterId, action }),
    });
    const data = await res.json();
    setRequestLoading(null);

    if (res.ok) {
      setRequestNotice(data.message ?? "Updated.");
      await loadFriends();
      if (action === "accept") {
        const accepted = incomingRequests.find((r) => r.id === requesterId);
        if (accepted) {
          setActiveFriend({
            id: accepted.id,
            username: accepted.username,
            avatar_url: accepted.avatar_url,
            reputation_score: accepted.reputation_score,
            connection_type: "request",
          });
        }
      }
    } else {
      setRequestNotice(data.error ?? "Request failed");
    }
  }

  const seasonal = getSeasonalTheme();

  if (loading || !user || !profile) {
    return (
      <div
        className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} text-slate-400`}
      >
        <ParticleBackground />
        <span className="relative z-10">Loading…</span>
      </div>
    );
  }

  const hasFriends = friends.length > 0;
  const hasRequests = incomingRequests.length > 0;

  return (
    <div
      className={`relative min-h-screen flex flex-col lg:flex-row bg-gradient-to-br ${seasonal.gradient} text-white overflow-hidden`}
    >
      <ParticleBackground />
      <main className="relative z-10 flex-1 max-w-md mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/profile" className="text-sm text-slate-400 hover:text-white">
            ← Profile
          </Link>
          <h1 className="text-lg font-extrabold bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent">
            Friends
          </h1>
          <Link href="/chat" className="text-xs text-emerald-400">
            Arena →
          </Link>
        </div>

        {requestNotice && (
          <p className="text-xs text-slate-300 mb-3 rounded-xl border border-purple-500/30 bg-slate-950/80 px-3 py-2">
            {requestNotice}
          </p>
        )}

        {hasRequests && (
          <section className="mb-6">
            <h2 className="text-xs font-bold text-fuchsia-300 mb-2 uppercase tracking-wide">
              Friend requests
            </h2>
            <ul className="space-y-2">
              {incomingRequests.map((request) => (
                <li
                  key={request.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-fuchsia-500/30 bg-slate-950/80 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-bold shrink-0 text-sm">
                      {request.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {request.username}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRequestAction(request.id, "accept")}
                      disabled={requestLoading === request.id}
                      className={`${chatBtnLove} !px-2.5 !py-1 !text-[10px]`}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestAction(request.id, "decline")}
                      disabled={requestLoading === request.id}
                      className={`${chatBtnGhost} !px-2.5 !py-1 !text-[10px]`}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!hasFriends && !hasRequests ? (
          <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-8 text-center">
            <p className="text-4xl mb-3">❤️</p>
            <p className="text-slate-300 font-medium">No friends yet</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              <strong className="text-pink-300">Connect</strong> when you both
              feel a spark, or send a low-pressure{" "}
              <strong className="text-fuchsia-300">Add friend</strong> in chat.
              You can also use{" "}
              <Link href="/profile" className="text-fuchsia-400 hover:underline">
                Profile → Recent matches
              </Link>
              .
            </p>
            <Link
              href="/chat"
              className="inline-block mt-6 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold px-6 py-3 text-sm"
            >
              Enter arena
            </Link>
          </div>
        ) : hasFriends ? (
          <ul className="space-y-3">
            {friends.map((friend) => (
              <li key={friend.id}>
                <button
                  type="button"
                  onClick={() => setActiveFriend(friend)}
                  className={`w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    activeFriend?.id === friend.id
                      ? "border-fuchsia-500 bg-fuchsia-500/10"
                      : "border-purple-500/20 bg-slate-950/80 hover:border-purple-500/40"
                  }`}
                >
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-bold shrink-0">
                    {friend.username.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{friend.username}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[10px] text-amber-300">
                        Rep {friend.reputation_score}
                      </p>
                      {connectionTypeLabel(friend.connection_type) && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            friend.connection_type === "mutual_connect"
                              ? "bg-pink-500/20 text-pink-200"
                              : "bg-purple-500/15 text-purple-200"
                          }`}
                        >
                          {friend.connection_type === "mutual_connect"
                            ? "✨ Mutual spark"
                            : connectionTypeLabel(friend.connection_type)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500 text-center">
            Accept a request above to start messaging.
          </p>
        )}
      </main>

      {activeFriend && (
        <div className="relative z-10">
          <FriendsPanel
            friendId={activeFriend.id}
            friendUsername={activeFriend.username}
            myId={profile.id}
          />
        </div>
      )}
    </div>
  );
}
