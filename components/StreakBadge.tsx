"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export function StreakBadge() {
  const { user, profile } = useAuth();
  if (!user || !profile) return null;

  const streak = profile.chat_streak ?? 0;
  if (streak <= 0) return null;

  return (
    <Link
      href="/profile"
      className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-200 hover:bg-orange-500/20 transition"
    >
      <span aria-hidden>🔥</span>
      {streak}-day streak
    </Link>
  );
}
