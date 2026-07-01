"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import dynamic from "next/dynamic";
import { FriendProfileSheet } from "@/components/FriendProfileSheet";
import { FriendsPanel } from "@/components/FriendsPanel";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { chatBtnGhost, chatBtnLove, chatBtnBlock } from "@/lib/chat-buttons";
import type { FriendConnectionType } from "@/lib/friends/connection-type";
import type { FriendProfileView } from "@/lib/friends/friend-profile-view";
import { getSeasonalTheme } from "@/lib/seasonal-theme";
import { AppQuickNav } from "@/components/AppQuickNav";
import { AppPageHeader } from "@/components/AppPageHeader";
import { markSenderRead } from "@/lib/notifications/seen-state";

const AdaptiveParticleBackground = dynamic(
  () =>
    import("@/components/AdaptiveParticleBackground").then((m) => ({
      default: m.AdaptiveParticleBackground,
    })),
  { ssr: false }
);

type Friend = {
  id: string;
  username: string;
  avatar_url: string | null;
  avatar_emoji?: string | null;
  reputation_score: number;
  connection_type: FriendConnectionType | null;
};

type IncomingRequest = Friend & {
  requested_at: string;
};

type OutgoingRequest = Friend & {
  requested_at: string;
};

function toFriend(profile: FriendProfileView): Friend {
  return {
    id: profile.id,
    username: profile.username,
    avatar_url: profile.avatarUrl,
    avatar_emoji: profile.avatarEmoji,
    reputation_score: profile.reputationScore,
    connection_type: profile.connectionType,
  };
}

function FriendRow({
  friend,
  chatActive,
  profileOpen,
  removing,
  onViewProfile,
  onMessage,
  onRemove,
}: {
  friend: Friend;
  chatActive: boolean;
  profileOpen: boolean;
  removing: boolean;
  onViewProfile: () => void;
  onMessage: () => void;
  onRemove: () => void;
}) {
  const accent = friend.connection_type === "mutual_connect" ? "pink" : "purple";
  const activeBorder =
    accent === "pink"
      ? "border-pink-500 bg-pink-500/10"
      : "border-fuchsia-500 bg-fuchsia-500/10";
  const highlighted = chatActive || profileOpen;

  return (
    <li>
      <div
        className={`flex items-center gap-1.5 rounded-2xl border p-2 pl-3 transition ${
          highlighted ? activeBorder : "border-purple-500/20 bg-slate-950/80"
        }`}
      >
        <button
          type="button"
          onClick={onViewProfile}
          className="flex flex-1 items-center gap-3 min-w-0 text-left hover:opacity-90"
          aria-label={`View ${friend.username}'s profile`}
        >
          <ProfileAvatar
            url={friend.avatar_url}
            emoji={friend.avatar_emoji}
            alt={friend.username}
            size="sm"
            className="shrink-0"
          />
          <div className="min-w-0">
            <p className="font-semibold truncate text-sm">{friend.username}</p>
            <p className="text-[10px] text-amber-300">Rep {friend.reputation_score}</p>
            {friend.connection_type === "mutual_connect" && (
              <p className="text-[10px] text-pink-300">✨ Mutual spark</p>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={onMessage}
          className={`${chatBtnLove} !px-2 !py-1.5 !text-[10px] shrink-0`}
          title={`Message ${friend.username}`}
        >
          Chat
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className={`${chatBtnBlock} !px-2 !py-1.5 !text-[10px] shrink-0`}
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
  const searchParams = useSearchParams();
  const chatIdFromUrl = searchParams.get("chat");
  const { confirm } = useConfirm();
  const { user, profile, loading } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>(
    []
  );
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingRequest[]>(
    []
  );
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [profileFriendId, setProfileFriendId] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);
  const [requestNotice, setRequestNotice] = useState<string | null>(null);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [friendsLoadError, setFriendsLoadError] = useState<string | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [friendLimit, setFriendLimit] = useState(200);
  const chatPanelRef = useRef<HTMLDivElement>(null);

  const loadFriends = useCallback(async () => {
    const res = await fetch("/api/friends", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setFriendsLoadError(data.error ?? "Could not load friends");
      setFriendsLoaded(true);
      return;
    }
    setFriendsLoadError(null);
    setFriends(data.friends ?? []);
    setIncomingRequests(data.incomingRequests ?? []);
    setOutgoingRequests(data.outgoingRequests ?? []);
    if (typeof data.friendCount === "number") setFriendCount(data.friendCount);
    if (typeof data.friendLimit === "number") setFriendLimit(data.friendLimit);
    setFriendsLoaded(true);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?next=/friends");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    loadFriends().catch(() => {});
  }, [user, loadFriends]);

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`friends-page:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `friend_id=eq.${user.id}`,
        },
        () => {
          void loadFriends();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadFriends]);

  useEffect(() => {
    if (!friendsLoaded || !chatIdFromUrl) return;

    const friend = friends.find((f) => f.id === chatIdFromUrl);
    if (friend) {
      setActiveFriend(friend);
      setProfileFriendId(null);
      markSenderRead(friend.id);
      router.replace("/friends", { scroll: false });
      return;
    }

    setRequestNotice("That friend wasn't found — they may have removed you.");
    router.replace("/friends", { scroll: false });
  }, [friendsLoaded, friends, chatIdFromUrl, router]);

  useEffect(() => {
    if (!activeFriend) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    const timer = window.setTimeout(() => {
      chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll when selected friend id changes only
  }, [activeFriend?.id]);

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
          setActiveFriend(accepted);
          markSenderRead(accepted.id);
        }
      }
    } else {
      setRequestNotice(data.error ?? "Request failed");
    }
  }

  async function handleRemoveFriend(friend: Friend) {
    const label =
      friend.connection_type === "mutual_connect" ? "mutual" : "friend";
    const ok = await confirm({
      title: "Remove friend?",
      message: `Remove ${friend.username} from your ${label}s? You can add them again from a future match.`,
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;

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
      if (activeFriend?.id === friend.id) setActiveFriend(null);
      if (profileFriendId === friend.id) setProfileFriendId(null);
      await loadFriends();
    } else {
      setRequestNotice(data.error ?? "Remove failed");
    }
  }

  async function handleCancelOutgoing(recipientId: string) {
    setRequestLoading(recipientId);
    setRequestNotice(null);
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId: recipientId, action: "cancel" }),
    });
    const data = await res.json();
    setRequestLoading(null);

    if (res.ok) {
      setRequestNotice(data.message ?? "Request cancelled.");
      await loadFriends();
    } else {
      setRequestNotice(data.error ?? "Cancel failed");
    }
  }

  async function handleBlockFriend(friendProfile: FriendProfileView) {
    const ok = await confirm({
      title: "Block user?",
      message: `Block ${friendProfile.username}? They won't be matched with you again.`,
      confirmLabel: "Block",
      variant: "danger",
    });
    if (!ok) return;

    setRequestNotice(null);
    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedId: friendProfile.id }),
    });

    if (res.ok) {
      setRequestNotice(`${friendProfile.username} blocked.`);
      if (activeFriend?.id === friendProfile.id) setActiveFriend(null);
      if (profileFriendId === friendProfile.id) setProfileFriendId(null);
      await loadFriends();
    } else {
      const data = await res.json();
      setRequestNotice(data.error ?? "Block failed");
    }
  }

  const seasonal = getSeasonalTheme();

  if (loading || !user || !profile) {
    return (
      <div
        className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} text-slate-400`}
      >
        <AdaptiveParticleBackground />
        <span className="relative z-10">Loading…</span>
      </div>
    );
  }

  const sortedFriends = [...friends].sort((a, b) => {
    const aSpark = a.connection_type === "mutual_connect" ? 0 : 1;
    const bSpark = b.connection_type === "mutual_connect" ? 0 : 1;
    return aSpark - bSpark;
  });
  const hasConnections = friends.length > 0;
  const hasRequests = incomingRequests.length > 0;
  const hasOutgoing = outgoingRequests.length > 0;

  function renderFriendRow(friend: Friend) {
    return (
      <FriendRow
        key={friend.id}
        friend={friend}
        chatActive={activeFriend?.id === friend.id}
        profileOpen={profileFriendId === friend.id}
        removing={removeLoading === friend.id}
        onViewProfile={() => setProfileFriendId(friend.id)}
        onMessage={() => {
          setActiveFriend(friend);
          setProfileFriendId(null);
          markSenderRead(friend.id);
        }}
        onRemove={() => handleRemoveFriend(friend)}
      />
    );
  }

  return (
    <div
      className={`relative min-h-screen flex flex-col lg:flex-row bg-gradient-to-br ${seasonal.gradient} text-white overflow-hidden`}
    >
      <AdaptiveParticleBackground />
      <main className="relative z-10 flex-1 max-w-md mx-auto lg:max-w-none w-full px-6 py-8 lg:py-8">
        <AppPageHeader
          title="Friends"
          backHref="/profile"
          backLabel="← Profile"
          action={
            <Link
              href="/chat"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Chat →
            </Link>
          }
          className="mb-5"
        />

        <AppQuickNav className="mb-5" />

        <div className="mb-5 rounded-xl border border-slate-600/30 bg-slate-950/60 px-3 py-2.5 text-[11px] text-slate-400 leading-relaxed">
          <p>
            <span className="font-semibold text-slate-300">Remove</span> unfriends
            them — you can match and add again later.
          </p>
          <p className="mt-1">
            <span className="font-semibold text-red-300/90">Block</span> stops
            future matches and ends active chats. Use{" "}
            <span className="font-semibold text-amber-300/90">Report</span> on a
            profile for moderation review.
          </p>
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
                    <ProfileAvatar
                      url={request.avatar_url}
                      emoji={request.avatar_emoji}
                      alt={request.username}
                      size="sm"
                    />
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

        {hasOutgoing && (
          <section className="mb-6">
            <h2 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
              Sent requests
            </h2>
            <ul className="space-y-2">
              {outgoingRequests.map((request) => (
                <li
                  key={request.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-slate-600/40 bg-slate-950/80 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ProfileAvatar
                      url={request.avatar_url}
                      emoji={request.avatar_emoji}
                      alt={request.username}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {request.username}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Waiting ·{" "}
                        {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelOutgoing(request.id)}
                    disabled={requestLoading === request.id}
                    className={`${chatBtnGhost} !px-2.5 !py-1 !text-[10px] shrink-0`}
                  >
                    {requestLoading === request.id ? "…" : "Cancel"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!friendsLoaded ? (
          <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-8 text-center">
            <p className="text-slate-400 text-sm">Loading friends…</p>
          </div>
        ) : friendsLoadError ? (
          <div className="rounded-3xl border border-red-500/30 bg-slate-950/80 p-8 text-center">
            <p className="text-red-300 text-sm">{friendsLoadError}</p>
            <button
              type="button"
              onClick={() => {
                setFriendsLoaded(false);
                void loadFriends();
              }}
              className={`${chatBtnGhost} mt-4`}
            >
              Try again
            </button>
          </div>
        ) : !hasConnections && !hasRequests && !hasOutgoing ? (
          <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-8 text-center">
            <p className="text-4xl mb-3">✨</p>
            <p className="text-slate-300 font-medium">No friends yet</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
              When you both tap{" "}
              <span className="text-pink-300/90">Feel the spark</span> in the
              arena, you&apos;ll show up here automatically. You can also tap{" "}
              <span className="text-fuchsia-300/90">Add friend</span> during
              chat, or accept a request when someone sends one.
            </p>
            <p className="text-[10px] text-slate-600 mt-3">
              Spark and friend requests are separate — use whichever fits the
              vibe.
            </p>
            <Link
              href="/chat"
              className="inline-block mt-6 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold px-6 py-3 text-sm"
            >
              Enter Lovarena
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <div>
                  <h2 className="text-xs font-bold text-fuchsia-300 uppercase tracking-wide">
                    Friends
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Mutual sparks and accepted requests · tap a name for profile
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold tabular-nums shrink-0 ${
                    friendCount >= friendLimit
                      ? "text-amber-400"
                      : "text-slate-500"
                  }`}
                  title={`${friendCount} of ${friendLimit} friend slots used`}
                >
                  {friendCount} / {friendLimit}
                </span>
              </div>
              {friendCount >= friendLimit && (
                <p className="text-[10px] text-amber-400/90 mb-2 leading-relaxed">
                  Friend list full — remove someone before accepting new requests.
                </p>
              )}
              <ul className="space-y-2">{sortedFriends.map(renderFriendRow)}</ul>
            </section>
          </div>
        )}
      </main>

      <FriendProfileSheet
        friendId={profileFriendId}
        open={profileFriendId != null}
        onClose={() => setProfileFriendId(null)}
        onMessage={(p) => {
          const friend = toFriend(p);
          setActiveFriend(friend);
          setProfileFriendId(null);
          markSenderRead(friend.id);
        }}
        onRemove={(p) => {
          setProfileFriendId(null);
          void handleRemoveFriend(toFriend(p));
        }}
        onBlock={(p) => {
          setProfileFriendId(null);
          void handleBlockFriend(p);
        }}
      />

      {activeFriend && (
        <div ref={chatPanelRef} className="relative z-10 lg:flex-1 lg:min-w-0">
          <FriendsPanel
            friendId={activeFriend.id}
            friendUsername={activeFriend.username}
            myId={profile.id}
            onClose={() => setActiveFriend(null)}
            onViewProfile={() => setProfileFriendId(activeFriend.id)}
            onRemoved={() => {
              setActiveFriend(null);
              setProfileFriendId(null);
              void loadFriends();
            }}
          />
        </div>
      )}
    </div>
  );
}
