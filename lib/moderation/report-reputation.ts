import type { SupabaseClient } from "@supabase/supabase-js";
import {
  REP_MAX_DAILY_REPORT_LOSS,
  REP_REPORT_PENALTY,
  REP_REPORTER_PAIR_COOLDOWN_MS,
  subtractReputation,
} from "@/lib/reputation";

export type ReportRepResult = {
  applied: boolean;
  newScore?: number;
  skipReason?: string;
};

export async function canApplyReportReputationPenalty(
  supabase: SupabaseClient,
  reporterId: string,
  reportedUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const pairSince = new Date(
    Date.now() - REP_REPORTER_PAIR_COOLDOWN_MS
  ).toISOString();

  const { count: priorPairReports } = await supabase
    .from("abuse_reports")
    .select("*", { count: "exact", head: true })
    .eq("reporter_id", reporterId)
    .eq("reported_user_id", reportedUserId)
    .gte("created_at", pairSince);

  if ((priorPairReports ?? 0) > 1) {
    return {
      allowed: false,
      reason:
        "You already reported this user recently. The report was logged for moderators without another reputation penalty.",
    };
  }

  const daySince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentReports } = await supabase
    .from("abuse_reports")
    .select("reporter_id")
    .eq("reported_user_id", reportedUserId)
    .gte("created_at", daySince);

  const uniqueReporters = new Set(
    (recentReports ?? []).map((row) => row.reporter_id)
  );

  if (uniqueReporters.size > REP_MAX_DAILY_REPORT_LOSS / REP_REPORT_PENALTY) {
    return {
      allowed: false,
      reason:
        "This user already received the maximum reputation impact from reports today. Moderators were still notified.",
    };
  }

  return { allowed: true };
}

export async function applyReportReputationPenalty(
  supabase: SupabaseClient,
  reporterId: string,
  reportedUserId: string
): Promise<ReportRepResult> {
  const gate = await canApplyReportReputationPenalty(
    supabase,
    reporterId,
    reportedUserId
  );

  if (!gate.allowed) {
    return { applied: false, skipReason: gate.reason };
  }

  const { data: newScore, error } = await supabase.rpc("subtract_reputation", {
    p_user_id: reportedUserId,
    p_amount: REP_REPORT_PENALTY,
  });

  if (error) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("reputation_score")
      .eq("id", reportedUserId)
      .maybeSingle();

    if (!profileRow) {
      return { applied: false, skipReason: "Profile not found." };
    }

    const fallbackScore = subtractReputation(
      profileRow.reputation_score ?? 100,
      REP_REPORT_PENALTY
    );

    await supabase
      .from("profiles")
      .update({ reputation_score: fallbackScore })
      .eq("id", reportedUserId);

    return { applied: true, newScore: fallbackScore };
  }

  if (newScore == null) {
    return { applied: false, skipReason: "Profile not found." };
  }

  return { applied: true, newScore };
}

export async function verifyRecentMatch(
  supabase: SupabaseClient,
  userId: string,
  partnerId: string
): Promise<boolean> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("match_history")
    .select("id")
    .eq("user_id", userId)
    .eq("partner_id", partnerId)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export function validateReportDetails(
  reason: string,
  details: string | null | undefined
): string | null {
  const text = details?.trim() ?? "";

  if (reason === "other" && text.length < 15) {
    return "Please describe what happened (at least 15 characters).";
  }

  if (reason === "underage" && text.length < 10) {
    return "Please explain why you believe this user may be underage.";
  }

  if (
    (
      reason === "hate_speech" ||
      reason === "harassment" ||
      reason === "sexual_harassment" ||
      reason === "violence_threats" ||
      reason === "scam"
    ) &&
    text.length < 8
  ) {
    return "Please describe what happened (at least 8 characters).";
  }

  if (reason === "inappropriate_profile" && text.length > 0 && text.length < 8) {
    return "Please add a bit more detail about the profile photo.";
  }

  return null;
}
