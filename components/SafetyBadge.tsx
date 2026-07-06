type SafetyTone = "green" | "amber" | "sky" | "violet";

type SafetyBadgeProps = {
  label: string;
  tone: SafetyTone;
  size?: "sm" | "md";
  className?: string;
};

const TONE_CLASS: Record<SafetyTone, string> = {
  green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/25",
  amber: "bg-amber-500/20 text-amber-300 border-amber-500/25",
  sky: "bg-sky-500/20 text-sky-300 border-sky-500/25",
  violet: "bg-violet-500/20 text-violet-300 border-violet-500/25",
};

const SIZE_CLASS = {
  sm: "text-[9px] px-2 py-0.5 tracking-wide",
  md: "text-[10px] px-3 py-1 tracking-wider",
} as const;

export function SafetyBadge({
  label,
  tone,
  size = "sm",
  className = "",
}: SafetyBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold uppercase ${TONE_CLASS[tone]} ${SIZE_CLASS[size]} ${className}`}
    >
      <span aria-hidden>{tone === "violet" ? "✓" : "🛡"}</span>
      {label}
    </span>
  );
}
