/** Keep in sync with vercel.json crons entry for review-flags. */
export const REVIEW_FLAGS_CRON = {
  path: "/api/cron/review-flags",
  schedule: "0 6 * * *",
  scheduleLabel: "Daily at 06:00 UTC",
} as const;
