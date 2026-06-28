export const REP_START = 100;
export const REP_MAX = 500;
export const REP_REFERRAL_BONUS = 5;
export const REP_THUMBS_UP = 2;
export const REP_THUMBS_DOWN = 10;
export const REP_REPORT_PENALTY = 20;
export const REP_TRUSTED_MIN = 400;
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
