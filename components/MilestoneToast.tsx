"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  detectMilestones,
  markMilestoneSeen,
  type MilestoneToast as Milestone,
} from "@/lib/milestones";
import { useToastBottomOffset } from "@/lib/hooks/useToastBottomOffset";

export function MilestoneToast() {
  const { profile } = useAuth();
  const toastOffset = useToastBottomOffset();
  const [toast, setToast] = useState<Milestone | null>(null);
  const snapshotRef = useRef<{
    streak: number;
    rep: number;
    referrals: number;
    partyHostUnlocked: boolean;
  } | null>(null);

  useEffect(() => {
    if (!profile) return;

    const next = {
      streak: profile.chat_streak ?? 0,
      rep: profile.reputation_score ?? 100,
      referrals: profile.qualified_referrals ?? 0,
      partyHostUnlocked: profile.party_host_unlocked ?? false,
    };

    const prev = snapshotRef.current;
    if (prev) {
      const hit = detectMilestones(prev, next);
      if (hit) {
        markMilestoneSeen(hit.id);
        setToast(hit);
      }
    }

    snapshotRef.current = next;
  }, [
    profile?.chat_streak,
    profile?.reputation_score,
    profile?.qualified_referrals,
    profile?.party_host_unlocked,
    profile,
  ]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className={`fixed ${toastOffset.activity} left-1/2 z-[95] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 animate-fade-in pointer-events-none`}
    >
      <div className="rounded-2xl border border-amber-500/40 bg-slate-900/95 backdrop-blur-xl p-4 shadow-xl shadow-amber-500/10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          {toast.title}
        </p>
        <p className="mt-1 text-sm text-slate-200">{toast.body}</p>
      </div>
    </div>
  );
}
