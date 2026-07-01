import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`push-sub:${user.id}:${ip}`, 20, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const { endpoint, keys } = await req.json();
    if (
      !endpoint ||
      !keys?.p256dh ||
      !keys?.auth ||
      typeof endpoint !== "string"
    ) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: String(keys.p256dh),
        auth: String(keys.auth),
        user_agent: req.headers.get("user-agent"),
      },
      { onConflict: "user_id,endpoint" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase
      .from("profiles")
      .update({ web_push_enabled: true })
      .eq("id", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Push subscribe failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { endpoint } = await req.json().catch(() => ({}));
    const supabase = createAdminClient();

    if (endpoint && typeof endpoint === "string") {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", endpoint);
    } else {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Push unsubscribe failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
