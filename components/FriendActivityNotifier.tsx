"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { playMessageSound } from "@/lib/sounds";
import { useToastBottomOffset } from "@/lib/hooks/useToastBottomOffset";

type ActivityToast = {
  id: string;
  title: string;
  body: string;
  href: string;
};

function seenKey(id: string) {
  return `lovarena_friend_activity_${id}`;
}

function markSeen(id: string) {
  try {
    sessionStorage.setItem(seenKey(id), "1");
  } catch {
    // ignore
  }
}

function wasSeen(id: string) {
  try {
    return sessionStorage.getItem(seenKey(id)) === "1";
  } catch {
    return false;
  }
}

async function usernameFor(
  supabase: ReturnType<typeof createClient>,
  profileId: string
) {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", profileId)
    .maybeSingle();
  return data?.username ?? "A friend";
}

export function FriendActivityNotifier() {
  const { profile } = useAuth();
  const pathname = usePathname();
  const toastOffset = useToastBottomOffset();
  const [toast, setToast] = useState<ActivityToast | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!profile?.id) return;

    const supabase = createClient();
    const myId = profile.id;

    function showToast(next: ActivityToast, playSound = false) {
      if (wasSeen(next.id)) return;
      markSeen(next.id);
      if (pathnameRef.current === "/friends") return;
      setToast(next);
      if (playSound) playMessageSound();
    }

    async function handleRow(
      row: {
        id: string;
        user_id: string;
        friend_id: string;
        status: string;
        connection_type?: string | null;
      },
      eventType: "INSERT" | "UPDATE"
    ) {
      const isIncomingRequest =
        row.status === "pending" && row.friend_id === myId;
      const isNewFriend =
        row.status === "accepted" &&
        (row.user_id === myId || row.friend_id === myId);

      if (isIncomingRequest && eventType === "INSERT") {
        const name = await usernameFor(supabase, row.user_id);
        showToast(
          {
            id: `req-${row.id}`,
            title: "Friend request",
            body: `${name} wants to be friends`,
            href: "/friends",
          },
          true
        );
        return;
      }

      if (isNewFriend) {
        if (row.user_id !== myId && row.friend_id !== myId) return;
        const otherId = row.user_id === myId ? row.friend_id : row.user_id;
        const dedupeId = `friend-pair-${[myId, otherId].sort().join("-")}`;
        const name = await usernameFor(supabase, otherId);
        const spark = row.connection_type === "mutual_connect";
        const acceptedMyRequest =
          !spark &&
          eventType === "UPDATE" &&
          row.user_id === myId &&
          row.friend_id === otherId;
        showToast(
          {
            id: dedupeId,
            title: spark
              ? "Mutual spark ✨"
              : acceptedMyRequest
                ? "Request accepted"
                : "New friend",
            body: spark
              ? `You and ${name} are connected`
              : acceptedMyRequest
                ? `${name} accepted your friend request!`
                : `You're now friends with ${name}`,
            href: spark || acceptedMyRequest ? `/friends?chat=${encodeURIComponent(otherId)}` : "/friends",
          },
          true
        );
      }
    }

    const channel = supabase
      .channel(`friend-activity:${myId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friendships",
          filter: `friend_id=eq.${myId}`,
        },
        (payload) => {
          void handleRow(
            payload.new as {
              id: string;
              user_id: string;
              friend_id: string;
              status: string;
              connection_type?: string | null;
            },
            "INSERT"
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friendships",
          filter: `friend_id=eq.${myId}`,
        },
        (payload) => {
          void handleRow(
            payload.new as {
              id: string;
              user_id: string;
              friend_id: string;
              status: string;
              connection_type?: string | null;
            },
            "UPDATE"
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friendships",
          filter: `user_id=eq.${myId}`,
        },
        (payload) => {
          void handleRow(
            payload.new as {
              id: string;
              user_id: string;
              friend_id: string;
              status: string;
              connection_type?: string | null;
            },
            "INSERT"
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friendships",
          filter: `user_id=eq.${myId}`,
        },
        (payload) => {
          void handleRow(
            payload.new as {
              id: string;
              user_id: string;
              friend_id: string;
              status: string;
              connection_type?: string | null;
            },
            "UPDATE"
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className={`fixed ${toastOffset.activity} left-1/2 z-[100] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 animate-fade-in`}
    >
      <div className="rounded-2xl border border-fuchsia-500/40 bg-slate-900/95 backdrop-blur-xl p-4 shadow-xl shadow-fuchsia-500/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-300">
          {toast.title}
        </p>
        <p className="mt-1 text-sm text-slate-200">{toast.body}</p>
        <div className="mt-3 flex gap-2">
          <Link
            href={toast.href}
            onClick={() => setToast(null)}
            className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 text-center text-xs font-bold text-white py-2"
          >
            View Friends
          </Link>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-xl border border-slate-600 px-3 text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
