"use client";

import { countryCodeToFlag } from "@/lib/flags";

export type ConnectionCardData = {
  matchMode: string;
  countryCode?: string;
  sharedTags: string[];
  safetyLabel: string;
  safetyTone: "green" | "amber" | "sky";
  partnerEmoji?: string;
};

type Props = {
  data: ConnectionCardData | null;
  visible: boolean;
  onDone: () => void;
};

export function ConnectionCardOverlay({ data, visible, onDone }: Props) {
  if (!visible || !data) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="max-w-sm w-full rounded-3xl border-2 border-fuchsia-500 bg-slate-900 p-8 text-center shadow-[0_0_40px_rgba(217,70,239,0.35)] animate-fade-in">
        <div className="text-5xl mb-3">{data.partnerEmoji ?? "🛸"}</div>
        <h3 className="text-fuchsia-400 font-extrabold text-xl tracking-wide">
          You&apos;re connected!
        </h3>
        <p className="text-slate-400 text-sm mt-2 capitalize">
          {data.matchMode} arena
          {data.countryCode && (
            <> · {countryCodeToFlag(data.countryCode)} regional</>
          )}
        </p>
        <span
          className={`inline-block mt-3 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
            data.safetyTone === "green"
              ? "bg-emerald-500/20 text-emerald-300"
              : data.safetyTone === "amber"
                ? "bg-amber-500/20 text-amber-300"
                : "bg-sky-500/20 text-sky-300"
          }`}
        >
          🛡 {data.safetyLabel}
        </span>
        {data.sharedTags.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {data.sharedTags.map((tag) => (
              <span
                key={tag}
                className="text-xs rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-200 px-3 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onDone}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold py-3"
        >
          Start chatting
        </button>
      </div>
    </div>
  );
}
