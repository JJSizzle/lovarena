export const REPORT_REASONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "sexual_harassment", label: "Sexual harassment" },
  { value: "hate_speech", label: "Hate speech or racism" },
  { value: "nudity", label: "Nudity on video" },
  { value: "inappropriate_profile", label: "Inappropriate profile photo" },
  { value: "violence_threats", label: "Threats or violence" },
  { value: "spam", label: "Spam or bot behavior" },
  { value: "scam", label: "Scam or fraud" },
  { value: "underage", label: "Possible underage user" },
  { value: "other", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const VALID_REPORT_REASONS: readonly ReportReason[] = REPORT_REASONS.map(
  (row) => row.value
);

export const REPORT_DETAILS_PLACEHOLDER =
  "Describe what happened (required for harassment, sexual harassment, hate speech, threats, scam, underage, and other)";

export function isReportReason(value: string): value is ReportReason {
  return (VALID_REPORT_REASONS as readonly string[]).includes(value);
}

export function reportReasonLabel(value: string): string {
  return REPORT_REASONS.find((row) => row.value === value)?.label ?? value;
}
