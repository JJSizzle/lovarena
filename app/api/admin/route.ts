import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { banUserFromPlatform, unflagUser } from "@/lib/moderation/ban-user";
import { notifyModerators } from "@/lib/moderation/notify-admin";
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
    const now = new Date().toISOString();

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
        .select(
          "user_id, reason, flagged_at, source_room_id, restricted_until, is_permanent_ban, review_status"
        )
        .eq("flagged_for_abuse", true)
        .or(`is_permanent_ban.eq.true,restricted_until.gt.${now}`)
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

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    if (!auth.profile.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`admin-ban:${auth.profile.id}:${ip}`, 30, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const { action, userId, reason, reportId } = await req.json();

    if (!userId || !action) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (action === "unflag") {
      await unflagUser(supabase, userId);
      return NextResponse.json({ ok: true });
    }

    if (action !== "ban") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const banReason = String(reason ?? "admin_ban").slice(0, 200);

    await banUserFromPlatform(supabase, userId, banReason);

    if (reportId) {
      await supabase
        .from("abuse_reports")
        .update({ status: "actioned" })
        .eq("id", reportId);
    }

    void notifyModerators({
      type: "admin_ban",
      reason: banReason,
      reportedUserId: userId,
      adminId: auth.profile.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
