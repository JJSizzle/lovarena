import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { getUserRestriction } from "@/lib/moderation/user-restriction";
import { notifyModerators } from "@/lib/moderation/notify-admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const ip = clientIp(req);
    const rl = await rateLimit(
      `restriction-appeal:${auth.profile.id}:${ip}`,
      1,
      86_400
    );
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const supabase = createAdminClient();
    const restriction = await getUserRestriction(supabase, auth.profile.id);

    if (!restriction.active) {
      return NextResponse.json(
        { error: "Your account is not restricted." },
        { status: 400 }
      );
    }

    if (restriction.isPermanentBan) {
      return NextResponse.json(
        { error: "Permanent bans cannot be appealed through this form." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const message =
      typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";

    if (message.length < 10) {
      return NextResponse.json(
        { error: "Please explain your appeal in at least 10 characters." },
        { status: 400 }
      );
    }

    const { data: appeal, error: insertError } = await supabase
      .from("restriction_appeals")
      .insert({
        user_id: auth.profile.id,
        message,
        restriction_reason: restriction.reason ?? "restricted",
        status: "open",
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await notifyModerators({
      type: "restriction_appeal",
      reason: restriction.reason ?? "restricted",
      reportedUserId: auth.profile.id,
      details: `${message}\nAppeal id: ${appeal?.id ?? "unknown"}`,
    });

    return NextResponse.json({
      ok: true,
      message:
        "Appeal submitted. Moderators will review it — restrictions still apply until lifted.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Appeal failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
