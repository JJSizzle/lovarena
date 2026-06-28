import { referralBadgeLabel } from "@/lib/referral/badges";

type Props = {
  qualifiedReferrals: number;
  className?: string;
};

export function ReferralBadge({ qualifiedReferrals, className = "" }: Props) {
  const label = referralBadgeLabel(qualifiedReferrals);
  if (!label) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200 ${className}`}
    >
      {label === "Ambassador" ? "🌟" : "🔗"} {label}
    </span>
  );
}
