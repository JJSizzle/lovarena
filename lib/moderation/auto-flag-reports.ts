import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AUTO_FLAG_UNIQUE_REPORTERS,
  REPORT_WINDOW_MS,
} from "@/lib/moderation/restriction-constants";
import {
  applyTimedRestriction,
  type TimedRestrictionResult,
} from "@/lib/moderation/user-restriction";

export async function maybeAutoRestrictFromReports(
  supabase: SupabaseClient,
  reportedUserId: string
): Promise<{ restricted: boolean; result?: TimedRestrictionResult }> {
  const since = new Date(Date.now() - REPORT_WINDOW_MS).toISOString();
  const { data: reports } = await supabase
    .from("abuse_reports")
    .select("reporter_id")
    .eq("reported_user_id", reportedUserId)
    .gte("created_at", since);

  const uniqueReporters = new Set(
    (reports ?? []).map((row) => row.reporter_id)
  );

  if (uniqueReporters.size < AUTO_FLAG_UNIQUE_REPORTERS) {
    return { restricted: false };
  }

  const result = await applyTimedRestriction(
    supabase,
    reportedUserId,
    "auto_flag: 3+ unique reporters in 24h"
  );

  return { restricted: true, result };
}
