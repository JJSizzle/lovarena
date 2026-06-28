export { REP_REFERRAL_BONUS as REFERRAL_REP_BONUS } from "@/lib/reputation";
export const CONNECTOR_REFERRALS = 3;
export const AMBASSADOR_REFERRALS = 10;

export function referralBadgeLabel(qualifiedReferrals: number): string | null {
  if (qualifiedReferrals >= AMBASSADOR_REFERRALS) return "Ambassador";
  if (qualifiedReferrals >= CONNECTOR_REFERRALS) return "Connector";
  return null;
}

export function isInvitedNewcomer(
  referredBy: string | null | undefined,
  createdAt: string
): boolean {
  if (!referredBy) return false;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs <= 7 * 24 * 60 * 60 * 1000;
}
