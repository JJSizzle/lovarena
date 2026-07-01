"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useAppNotifications } from "@/components/NotificationProvider";
import { playMessageSound } from "@/lib/sounds";
import { markSenderRead } from "@/lib/notifications/seen-state";
import { useToastBottomOffset } from "@/lib/hooks/useToastBottomOffset";

type Toast = {
  id: string;
  senderId: string;
  senderUsername: string;
  preview: string;
  createdAt: string;
};

function titleForUnread(count: number, senderUsername: string) {
  if (count <= 1) return `(1) ${senderUsername} messaged you`;
  return `(${count}) new messages`;
}

export function FriendMessageNotifier() {
  const { profile } = useAuth();
  const { unreadMessageCount, refresh } = useAppNotifications();
  const pathname = usePathname();
  const toastOffset = useToastBottomOffset();
  const [toast, setToast] = useState<Toast | null>(null);
  const baseTitle = useRef<string>("");
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkingRef = useRef(false);
  const latestSenderRef = useRef("A friend");

  useEffect(() => {
    baseTitle.current = document.title;
  }, []);

  useEffect(() => {
    if (!blinkingRef.current || !document.hidden) return;

    const count = Math.max(unreadMessageCount, 1);
    const alertTitle = titleForUnread(count, latestSenderRef.current);

    if (blinkRef.current) clearInterval(blinkRef.current);
    let on = true;
    blinkRef.current = setInterval(() => {
      document.title = on ? alertTitle : baseTitle.current;
      on = !on;
    }, 1200);

    return () => {
      if (blinkRef.current) {
        clearInterval(blinkRef.current);
        blinkRef.current = null;
      }
    };
  }, [unreadMessageCount]);

  useEffect(() => {
    if (!profile?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`dm-notify:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `receiver_id=eq.${profile.id}`,
        },
        async (payload) => {
          const msg = payload.new as {
            id: string;
            sender_id: string;
            content: string;
            created_at: string;
          };

          const { data: sender } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", msg.sender_id)
            .maybeSingle();

          const senderUsername = sender?.username ?? "A friend";
          const preview =
            msg.content.length > 80
              ? `${msg.content.slice(0, 77)}…`
              : msg.content;

          if (pathname !== "/friends") {
            setToast({
              id: msg.id,
              senderId: msg.sender_id,
              senderUsername,
              preview,
              createdAt: msg.created_at,
            });
            playMessageSound();
          }

          if (document.hidden) {
            latestSenderRef.current = senderUsername;
            blinkingRef.current = true;
          }

          void refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      blinkingRef.current = false;
      if (blinkRef.current) {
        clearInterval(blinkRef.current);
        blinkRef.current = null;
      }
      document.title = baseTitle.current;
    };
  }, [profile?.id, pathname, refresh]);

  useEffect(() => {
    function resetTitle() {
      blinkingRef.current = false;
      if (blinkRef.current) {
        clearInterval(blinkRef.current);
        blinkRef.current = null;
      }
      document.title = baseTitle.current;
    }

    function onFocus() {
      resetTitle();
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  function openMessage() {
    markSenderRead(toast!.senderId, toast!.createdAt);
    setToast(null);
  }

  return (
    <div
      className={`fixed ${toastOffset.message} left-1/2 z-[100] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 animate-fade-in`}
    >
      <div className="rounded-2xl border border-pink-500/40 bg-slate-900/95 backdrop-blur-xl p-4 shadow-xl shadow-pink-500/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-pink-400">
          New message
        </p>
        <p className="mt-1 text-sm font-bold text-white">{toast.senderUsername}</p>
        <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{toast.preview}</p>
        <div className="mt-3 flex gap-2">
          <Link
            href={`/friends?chat=${encodeURIComponent(toast.senderId)}`}
            onClick={openMessage}
            className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-500 text-center text-xs font-bold text-white py-2"
          >
            Reply
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
