import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

export async function GET() {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    if (!auth.profile.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();

    const [reports, flagged, openCount] = await Promise.all([
      supabase
        .from("abuse_reports")
        .select(
          "id, reason, details, status, created_at, reporter_id, reported_user_id, room_id"
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("flagged_users")
        .select("user_id, reason, flagged_at, source_room_id")
        .eq("flagged_for_abuse", true)
        .order("flagged_at", { ascending: false })
        .limit(50),
      supabase
        .from("abuse_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
    ]);

    return NextResponse.json({
      reports: reports.data ?? [],
      flagged: flagged.data ?? [],
      openReportCount: openCount.count ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Admin fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    if (!auth.profile.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`admin:${auth.profile.id}:${ip}`, 60, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const { reportId, status } = await req.json();
    if (!reportId || !status) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("abuse_reports")
      .update({ status })
      .eq("id", reportId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
