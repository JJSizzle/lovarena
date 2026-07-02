"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useAppNotifications } from "@/components/NotificationProvider";
import { markSenderRead } from "@/lib/notifications/seen-state";

const HIDDEN_PREFIXES = ["/login", "/auth/"];

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const { user } = useAuth();
  const pathname = usePathname();
  const {
    friendRequests,
    unreadMessages,
    totalCount,
    unreadMessageCount,
    hasMoreMessages,
    loadingMoreMessages,
    refresh,
    loadMoreMessages,
  } = useAppNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const hidden =
    !user || HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (hidden) return null;

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      if (next) void refresh();
      return next;
    });
  }

  function handleMessageClick(senderId: string, createdAt: string) {
    markSenderRead(senderId, createdAt);
    setOpen(false);
  }

  const hasItems = friendRequests.length > 0 || unreadMessages.length > 0;

  return (
    <div ref={rootRef} className="fixed top-3 right-3 z-[200]">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={
          totalCount > 0
            ? `${totalCount} notifications`
            : "Notifications"
        }
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-purple-500/30 bg-slate-900/90 text-slate-200 shadow-lg backdrop-blur-md transition hover:border-fuchsia-400/50 hover:text-white"
      >
        <BellIcon className="h-5 w-5" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.15rem] h-[1.15rem] rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white flex items-center justify-center shadow-md">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-purple-500/30 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-purple-500/20 px-4 py-3">
            <p className="text-sm font-bold text-white">Notifications</p>
            <p className="text-[11px] text-slate-400">
              Friend requests and private messages
            </p>
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {!hasItems ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                You&apos;re all caught up.
              </p>
            ) : (
              <ul className="divide-y divide-purple-500/10">
                {friendRequests.map((req) => (
                  <li key={`req-${req.id}`}>
                    <Link
                      href="/friends"
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-fuchsia-500/10 transition"
                    >
                      <ProfileAvatar
                        url={req.avatarUrl}
                        emoji={req.avatarEmoji}
                        alt={req.username}
                        size="sm"
                        className="shrink-0 mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-300">
                          Friend request
                        </p>
                        <p className="text-sm font-semibold text-white truncate">
                          {req.username}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Wants to be friends · {formatWhen(req.createdAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}

                {unreadMessages.map((msg) => (
                  <li key={`msg-${msg.id}`}>
                    <Link
                      href={`/friends?chat=${encodeURIComponent(msg.senderId)}`}
                      onClick={() =>
                        handleMessageClick(msg.senderId, msg.createdAt)
                      }
                      className="flex items-start gap-3 px-4 py-3 hover:bg-pink-500/10 transition"
                    >
                      <ProfileAvatar
                        url={msg.avatarUrl}
                        emoji={msg.avatarEmoji}
                        alt={msg.username}
                        size="sm"
                        className="shrink-0 mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-pink-300">
                          Message
                        </p>
                        <p className="text-sm font-semibold text-white truncate">
                          {msg.username}
                        </p>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {msg.preview}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {formatWhen(msg.createdAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-purple-500/20 px-4 py-2.5 space-y-1.5">
            {hasMoreMessages && (
              <button
                type="button"
                onClick={() => void loadMoreMessages()}
                disabled={loadingMoreMessages}
                className="block w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-200 disabled:opacity-50"
              >
                {loadingMoreMessages
                  ? "Loading…"
                  : `Load more messages (${unreadMessages.length} of ${unreadMessageCount})`}
              </button>
            )}
            <Link
              href="/friends"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold text-fuchsia-300 hover:text-fuchsia-200"
            >
              Open Friends
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
