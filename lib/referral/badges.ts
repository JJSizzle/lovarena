export const REFERRAL_REP_BONUS = 5;

export function referralBadgeLabel(qualifiedReferrals: number): string | null {
  if (qualifiedReferrals >= 5) return "Ambassador";
  if (qualifiedReferrals >= 1) return "Connector";
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
