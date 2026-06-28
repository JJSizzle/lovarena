export const RESTRICT_DURATION_MS = 24 * 60 * 60 * 1000;
export const STRIKE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const REPORT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const AUTO_FLAG_UNIQUE_REPORTERS = 3;

export const SERIOUS_REPORT_REASONS = [
  "nudity",
  "underage",
  "violence_threats",
  "hate_speech",
  "sexual_harassment",
  "inappropriate_profile",
] as const;

export type ReviewStatus =
  | "pending"
  | "upheld"
  | "dismissed"
  | "banned"
  | "expired";

export type UserRestriction = {
  active: boolean;
  isPermanentBan: boolean;
  restrictedUntil: string | null;
  reason: string | null;
  reviewStatus: ReviewStatus | null;
};

export type RestrictionApiPayload = {
  flagged: true;
  isPermanentBan: boolean;
  restrictedUntil: string | null;
  error: string;
};

export function formatRestrictionMessage(
  restriction: Pick<
    UserRestriction,
    "isPermanentBan" | "restrictedUntil"
  >
): string {
  if (restriction.isPermanentBan) {
    return "Your account has been banned for violating community guidelines.";
  }
  if (restriction.restrictedUntil) {
    const until = new Date(restriction.restrictedUntil);
    return `Your account is restricted until ${until.toLocaleString()}. You cannot match during this time.`;
  }
  return "Your account is restricted due to a community guidelines violation.";
}
