"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { playMessageSound } from "@/lib/sounds";

type Toast = {
  id: string;
  senderUsername: string;
  preview: string;
};

export function FriendMessageNotifier() {
  const { profile } = useAuth();
  const pathname = usePathname();
  const [toast, setToast] = useState<Toast | null>(null);
  const baseTitle = useRef<string>("");
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    baseTitle.current = document.title;
  }, []);

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
            setToast({ id: msg.id, senderUsername, preview });
            playMessageSound();
          }

          if (document.hidden) {
            if (blinkRef.current) clearInterval(blinkRef.current);
            let on = true;
            blinkRef.current = setInterval(() => {
              document.title = on
                ? `(1) ${senderUsername} messaged you`
                : baseTitle.current;
              on = !on;
            }, 1200);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (blinkRef.current) {
        clearInterval(blinkRef.current);
        blinkRef.current = null;
      }
      document.title = baseTitle.current;
    };
  }, [profile?.id, pathname]);

  useEffect(() => {
    function resetTitle() {
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

  return (
    <div className="fixed bottom-20 left-1/2 z-[100] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 animate-fade-in">
      <div className="rounded-2xl border border-pink-500/40 bg-slate-900/95 backdrop-blur-xl p-4 shadow-xl shadow-pink-500/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-pink-400">
          New message
        </p>
        <p className="mt-1 text-sm font-bold text-white">{toast.senderUsername}</p>
        <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{toast.preview}</p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/friends"
            onClick={() => setToast(null)}
            className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-500 text-center text-xs font-bold text-white py-2"
          >
            Open Friends
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
