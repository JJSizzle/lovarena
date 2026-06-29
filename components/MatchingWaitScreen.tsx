"use client";

import { useEffect, useState } from "react";
import { MATCH_WAIT_TIPS } from "@/lib/profile-tags";
import {
  estimateMatchWaitSeconds,
  formatWaitEstimate,
} from "@/lib/match-wait-estimate";
import { chatBtnGhost, chatBtnWarn } from "@/lib/chat-buttons";
import { getUsStateName } from "@/lib/us-states";

const EXPAND_AFTER_SECONDS = 30;

type Props = {
  visible: boolean;
  stateCode?: string | null;
  onCancel?: () => void;
  cancelling?: boolean;
  onExpandToCountry?: () => void;
  expanding?: boolean;
};

export function MatchingWaitScreen({
  visible,
  stateCode = null,
  onCancel,
  cancelling,
  onExpandToCountry,
  expanding = false,
}: Props) {
  const [online, setOnline] = useState<number | null>(null);
  const [inQueue, setInQueue] = useState<number | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const stateName = getUsStateName(stateCode);
  const canExpand =
    Boolean(stateCode && onExpandToCountry) &&
    elapsedSeconds >= EXPAND_AFTER_SECONDS;

  useEffect(() => {
    if (!visible) {
      setElapsedSeconds(0);
      return;
    }

    const started = Date.now();
    const elapsedInterval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);

    return () => clearInterval(elapsedInterval);
  }, [visible, stateCode]);

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
      {stateName && (
        <p className="mt-1 text-[11px] text-purple-300/80">
          Same state · {stateName}
        </p>
      )}
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
      {canExpand && (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3">
          <p className="text-[11px] text-amber-200/90 mb-2 leading-snug">
            Taking a while in {stateName}? Widen to your whole country for more
            matches.
          </p>
          <button
            type="button"
            onClick={onExpandToCountry}
            disabled={expanding}
            className={`${chatBtnWarn} mx-auto !text-xs`}
          >
            {expanding ? "Updating…" : "Expand to whole country"}
          </button>
        </div>
      )}
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
