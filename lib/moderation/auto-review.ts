import type { SupabaseClient } from "@supabase/supabase-js";
import { REP_TRUSTED_MIN } from "@/lib/reputation";
import {
  REPORT_WINDOW_MS,
  SERIOUS_REPORT_REASONS,
} from "@/lib/moderation/restriction-constants";
import {
  expireElapsedRestrictions,
  liftRestriction,
} from "@/lib/moderation/user-restriction";

type ReportRow = {
  reporter_id: string;
  reason: string;
  details: string | null;
};

type ReportAnalysis = {
  uniqueReporters: number;
  hasSeriousWithDetails: boolean;
  allSpamWithoutDetails: boolean;
  trustedProfile: boolean;
};

async function fetchRecentReports(
  supabase: SupabaseClient,
  userId: string
): Promise<ReportRow[]> {
  const since = new Date(Date.now() - REPORT_WINDOW_MS).toISOString();
  const { data } = await supabase
    .from("abuse_reports")
    .select("reporter_id, reason, details")
    .eq("reported_user_id", userId)
    .gte("created_at", since);

  return (data as ReportRow[] | null) ?? [];
}

async function analyzeReportCluster(
  supabase: SupabaseClient,
  userId: string
): Promise<ReportAnalysis> {
  const reports = await fetchRecentReports(supabase, userId);
  const uniqueReporters = new Set(reports.map((row) => row.reporter_id)).size;

  const hasSeriousWithDetails = reports.some(
    (row) =>
      (SERIOUS_REPORT_REASONS as readonly string[]).includes(row.reason) &&
      (row.details?.trim().length ?? 0) >= 8
  );

  const allSpamWithoutDetails =
    reports.length > 0 &&
    reports.every(
      (row) => row.reason === "spam" && !(row.details?.trim().length ?? 0)
    );

  const { data: profile } = await supabase
    .from("profiles")
    .select("reputation_score, age_verified")
    .eq("id", userId)
    .maybeSingle();

  const trustedProfile =
    (profile?.reputation_score ?? 0) >= REP_TRUSTED_MIN &&
    Boolean(profile?.age_verified);

  return {
    uniqueReporters,
    hasSeriousWithDetails,
    allSpamWithoutDetails,
    trustedProfile,
  };
}

export function isWeakReportCase(analysis: ReportAnalysis): boolean {
  if (analysis.uniqueReporters < 3) return true;
  if (analysis.uniqueReporters < 2) return true;
  if (analysis.allSpamWithoutDetails) return true;
  if (analysis.trustedProfile && !analysis.hasSeriousWithDetails) return true;
  return false;
}

async function dismissRecentReports(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const since = new Date(Date.now() - REPORT_WINDOW_MS).toISOString();
  await supabase
    .from("abuse_reports")
    .update({ status: "dismissed" })
    .eq("reported_user_id", userId)
    .eq("status", "open")
    .gte("created_at", since);
}

export type ModerationReviewSummary = {
  expired: number;
  earlyUnrestricted: number;
  upheld: number;
};

export async function runModerationReviewCycle(
  supabase: SupabaseClient
): Promise<ModerationReviewSummary> {
  const expired = await expireElapsedRestrictions(supabase);

  const { data: pending } = await supabase
    .from("flagged_users")
    .select("user_id, reason")
    .eq("flagged_for_abuse", true)
    .eq("review_status", "pending")
    .eq("is_permanent_ban", false);

  let earlyUnrestricted = 0;
  let upheld = 0;

  for (const row of pending ?? []) {
    const reason = row.reason ?? "";

    if (
      reason === "severe_hate_speech_or_slur" ||
      reason.startsWith("second_strike") ||
      reason.startsWith("admin_ban")
    ) {
      await supabase
        .from("flagged_users")
        .update({
          review_status: "upheld",
          auto_reviewed_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id);
      upheld++;
      continue;
    }

    const analysis = await analyzeReportCluster(supabase, row.user_id);

    if (isWeakReportCase(analysis)) {
      await liftRestriction(supabase, row.user_id, "dismissed", "early_unrestrict");
      await dismissRecentReports(supabase, row.user_id);
      earlyUnrestricted++;
      continue;
    }

    await supabase
      .from("flagged_users")
      .update({
        review_status: "upheld",
        auto_reviewed_at: new Date().toISOString(),
      })
      .eq("user_id", row.user_id);
    upheld++;
  }

  return { expired, earlyUnrestricted, upheld };
}
