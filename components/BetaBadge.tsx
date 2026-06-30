import { SITE_BETA } from "@/lib/site";

type BetaBadgeProps = {
  size?: "sm" | "md";
  className?: string;
};

const SIZE_CLASS = {
  sm: "px-1.5 py-px text-[8px] tracking-[0.18em]",
  md: "px-2 py-0.5 text-[9px] tracking-[0.15em]",
} as const;

export function BetaBadge({ size = "md", className = "" }: BetaBadgeProps) {
  if (!SITE_BETA) return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/[0.06] font-semibold uppercase text-slate-300/90 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${SIZE_CLASS[size]} ${className}`}
      title="Lovarena is in early access"
    >
      Beta
    </span>
  );
}
