"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { FriendsPanel } from "@/components/FriendsPanel";
import { ParticleBackground } from "@/components/ParticleBackground";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

type Friend = {
  id: string;
  username: string;
  avatar_url: string | null;
  reputation_score: number;
};

export default function FriendsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?next=/friends");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => setFriends(d.friends ?? []))
      .catch(() => {});
  }, [user]);

  const seasonal = getSeasonalTheme();

  if (loading || !user || !profile) {
    return (
      <div className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} text-slate-400`}>
        <ParticleBackground />
        <span className="relative z-10">Loading…</span>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen flex flex-col lg:flex-row bg-gradient-to-br ${seasonal.gradient} text-white overflow-hidden`}>
      <ParticleBackground />
      <main className="relative z-10 flex-1 max-w-md mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/profile" className="text-sm text-slate-400 hover:text-white">← Profile</Link>
          <h1 className="text-lg font-extrabold bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent">
            Friends
          </h1>
          <Link href="/chat" className="text-xs text-emerald-400">Arena →</Link>
        </div>

        {friends.length === 0 ? (
          <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-8 text-center">
            <p className="text-4xl mb-3">❤️</p>
            <p className="text-slate-300 font-medium">No friends yet</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Tap ❤️ Connect during a chat, or use{" "}
              <Link href="/profile" className="text-fuchsia-400 hover:underline">
                Profile → Recent matches
              </Link>{" "}
              to add someone you matched with in the last 30 days.
            </p>
            <Link href="/chat" className="inline-block mt-6 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold px-6 py-3 text-sm">
              Enter arena
            </Link>
          </div>
        ) : (
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
                    <p className="text-[10px] text-amber-300">Rep {friend.reputation_score}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
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
