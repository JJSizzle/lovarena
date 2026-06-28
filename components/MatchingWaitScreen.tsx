"use client";

import { useEffect, useState } from "react";
import { MATCH_WAIT_TIPS } from "@/lib/profile-tags";
import {
  estimateMatchWaitSeconds,
  formatWaitEstimate,
} from "@/lib/match-wait-estimate";
import { chatBtnGhost } from "@/lib/chat-buttons";

type Props = {
  visible: boolean;
  onCancel?: () => void;
  cancelling?: boolean;
};

export function MatchingWaitScreen({ visible, onCancel, cancelling }: Props) {
  const [online, setOnline] = useState<number | null>(null);
  const [inQueue, setInQueue] = useState<number | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;

    async function loadStats() {
      try {
        const res = await fetch("/api/stats/online", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setOnline(data.online);
          setInQueue(data.inQueue);
          setWaitSeconds(estimateMatchWaitSeconds(data.online, data.inQueue));
        }
      } catch {
        // ignore
      }
    }

    loadStats();
    const statsInterval = setInterval(loadStats, 5000);
    const tipInterval = setInterval(() => {
      setTipIndex((i) => (i + 1) % MATCH_WAIT_TIPS.length);
    }, 6000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(tipInterval);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="mx-4 mb-4 rounded-3xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-5 text-center shadow-[0_0_30px_rgba(168,85,247,0.12)]">
      <div className="text-3xl mb-2 animate-pulse">🔮</div>
      <p className="text-fuchsia-300 font-bold text-sm tracking-wide">
        Finding your match…
      </p>
      <p className="mt-2 text-xs text-cyan-300/90">
        {formatWaitEstimate(waitSeconds)}
      </p>
      <div className="mt-3 flex justify-center gap-6 text-xs text-slate-400">
        <span>
          Online:{" "}
          <strong className="text-cyan-300">{online ?? "…"}</strong>
        </span>
        <span>
          In queue:{" "}
          <strong className="text-pink-300">{inQueue ?? "…"}</strong>
        </span>
      </div>
      <p className="mt-4 text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
        {MATCH_WAIT_TIPS[tipIndex]}
      </p>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelling}
          className={`${chatBtnGhost} mt-4 mx-auto !text-xs`}
        >
          {cancelling ? "Leaving queue…" : "Cancel waiting"}
        </button>
      )}
    </div>
  );
}
