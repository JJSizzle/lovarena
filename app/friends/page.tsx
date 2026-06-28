"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { FriendsPanel } from "@/components/FriendsPanel";
import { ParticleBackground } from "@/components/ParticleBackground";
import { chatBtnGhost, chatBtnLove, chatBtnBlock } from "@/lib/chat-buttons";
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

function FriendRow({
  friend,
  active,
  accent,
  removing,
  onSelect,
  onRemove,
}: {
  friend: Friend;
  active: boolean;
  accent: "pink" | "purple";
  removing: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const activeBorder =
    accent === "pink" ? "border-pink-500 bg-pink-500/10" : "border-fuchsia-500 bg-fuchsia-500/10";
  const avatarGradient =
    accent === "pink"
      ? "from-pink-500 to-rose-600"
      : "from-fuchsia-500 to-purple-600";

  return (
    <li>
      <div
        className={`flex items-center gap-2 rounded-2xl border p-2 pl-4 transition ${
          active ? activeBorder : "border-purple-500/20 bg-slate-950/80"
        }`}
      >
        <button
          type="button"
          onClick={onSelect}
          className="flex flex-1 items-center gap-3 min-w-0 text-left hover:opacity-90"
        >
          <div
            className={`h-10 w-10 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center font-bold shrink-0`}
          >
            {friend.username.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{friend.username}</p>
            <p className="text-[10px] text-amber-300">Rep {friend.reputation_score}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className={`${chatBtnBlock} !px-2.5 !py-1.5 !text-[10px] shrink-0`}
          title={`Remove ${friend.username}`}
        >
          {removing ? "…" : "Remove"}
        </button>
      </div>
    </li>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>(
    []
  );
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [requestLoading, setRequestLoading] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);
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

  async function handleRemoveFriend(friend: Friend) {
    const label =
      friend.connection_type === "mutual_connect" ? "mutual" : "friend";
    if (
      !confirm(
        `Remove ${friend.username} from your ${label}s? You can add them again from a future match.`
      )
    ) {
      return;
    }

    setRemoveLoading(friend.id);
    setRequestNotice(null);

    const res = await fetch("/api/friends", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId: friend.id }),
    });
    const data = await res.json();
    setRemoveLoading(null);

    if (res.ok) {
      setRequestNotice(data.message ?? "Removed.");
      if (activeFriend?.id === friend.id) {
        setActiveFriend(null);
      }
      await loadFriends();
    } else {
      setRequestNotice(data.error ?? "Remove failed");
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

  const mutuals = friends.filter((f) => f.connection_type === "mutual_connect");
  const requestFriends = friends.filter(
    (f) => f.connection_type !== "mutual_connect"
  );
  const hasConnections = friends.length > 0;
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

        {!hasConnections && !hasRequests ? (
          <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-8 text-center">
            <p className="text-4xl mb-3">❤️</p>
            <p className="text-slate-300 font-medium">No friends yet</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              <strong className="text-pink-300">Connect</strong> when you both
              feel a spark — they&apos;ll show under{" "}
              <strong className="text-pink-300">Mutuals</strong>. Send a
              low-pressure <strong className="text-fuchsia-300">Add friend</strong>{" "}
              for the Friends list, or use{" "}
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
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="text-xs font-bold text-pink-300 mb-1 uppercase tracking-wide">
                ✨ Mutuals
              </h2>
              <p className="text-[10px] text-slate-500 mb-2">
                You both tapped Connect in chat
              </p>
              {mutuals.length === 0 ? (
                <p className="text-xs text-slate-600 rounded-2xl border border-dashed border-pink-500/20 bg-slate-950/40 px-4 py-3">
                  No mutual sparks yet — connect with someone in the arena.
                </p>
              ) : (
                <ul className="space-y-2">
                  {mutuals.map((friend) => (
                    <FriendRow
                      key={friend.id}
                      friend={friend}
                      active={activeFriend?.id === friend.id}
                      accent="pink"
                      removing={removeLoading === friend.id}
                      onSelect={() => setActiveFriend(friend)}
                      onRemove={() => handleRemoveFriend(friend)}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-xs font-bold text-fuchsia-300 mb-1 uppercase tracking-wide">
                Friends
              </h2>
              <p className="text-[10px] text-slate-500 mb-2">
                Added via friend request
              </p>
              {requestFriends.length === 0 ? (
                <p className="text-xs text-slate-600 rounded-2xl border border-dashed border-purple-500/20 bg-slate-950/40 px-4 py-3">
                  {hasRequests
                    ? "Accept a request above to add them here."
                    : "No friends from requests yet."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {requestFriends.map((friend) => (
                    <FriendRow
                      key={friend.id}
                      friend={friend}
                      active={activeFriend?.id === friend.id}
                      accent="purple"
                      removing={removeLoading === friend.id}
                      onSelect={() => setActiveFriend(friend)}
                      onRemove={() => handleRemoveFriend(friend)}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>

      {activeFriend && (
        <div className="relative z-10">
          <FriendsPanel
            friendId={activeFriend.id}
            friendUsername={activeFriend.username}
            myId={profile.id}
            onRemoved={() => {
              setActiveFriend(null);
              void loadFriends();
            }}
          />
        </div>
      )}
    </div>
  );
}
