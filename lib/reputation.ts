export const REP_START = 100;
export const REP_MAX = 500;
export const REP_REFERRAL_BONUS = 5;
/** One-time bonus after government ID verification. */
export const REP_ID_VERIFICATION_BONUS = 25;
export const REP_THUMBS_UP = 3;
export const REP_THUMBS_DOWN = 5;
export const REP_REPORT_PENALTY = 20;
export const REP_TRUSTED_MIN = 400;
/** Reputation required to unlock party hosting (one-time unlock). */
export const REP_PARTY_HOST_MIN = 125;
/** Hosting pauses when reputation drops below this (even if previously unlocked). */
export const REP_PARTY_HOST_REVOKE = 75;
/** At or below this score = low reputation (slower match limits). */
export const REP_LOW_MAX = 75;
export const REP_MAX_DAILY_REPORT_LOSS = 40;
export const REP_REPORTER_PAIR_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function clampReputation(score: number): number {
  if (!Number.isFinite(score)) return REP_START;
  return Math.min(REP_MAX, Math.max(0, Math.round(score)));
}

export function addReputation(score: number, delta: number): number {
  return clampReputation(score + delta);
}

export function subtractReputation(score: number, delta: number): number {
  return clampReputation(score - delta);
}

export function reputationTier(score: number): string {
  const rep = clampReputation(score);
  if (rep >= REP_TRUSTED_MIN) return "Trusted";
  if (rep >= 250) return "Established";
  if (rep >= 150) return "Rising";
  return "New member";
}
