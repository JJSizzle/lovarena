import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureServerError } from "@/lib/capture-error";
import { runModerationReviewCycle } from "@/lib/moderation/auto-review";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ranAt = new Date().toISOString();

  try {
    const supabase = createAdminClient();
    const summary = await runModerationReviewCycle(supabase);
    const result = { ok: true, ranAt, ...summary };
    console.info("cron_review_flags", result);
    return NextResponse.json(result);
  } catch (err) {
    await captureServerError(err, { cron: "review-flags", ranAt });
    const message = err instanceof Error ? err.message : "Review cycle failed";
    console.error("cron_review_flags_failed", { ranAt, message });
    return NextResponse.json({ error: message, ranAt }, { status: 500 });
  }
}
