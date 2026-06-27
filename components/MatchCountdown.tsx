"use client";

type Props = {
  countdown: number | null;
  visible: boolean;
};

export function MatchCountdown({ countdown, visible }: Props) {
  if (!visible || countdown === null) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm pointer-events-none">
      <div className="text-center animate-pulse">
        {countdown > 0 ? (
          <span className="text-8xl font-black bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">
            {countdown}
          </span>
        ) : (
          <span className="text-4xl font-extrabold text-emerald-400">Connected!</span>
        )}
      </div>
    </div>
  );
}
