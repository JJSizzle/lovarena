import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

/** Sets age_verified after the client 18+ gate (honor-system, rate-limited). */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`verify-age:${user.id}:${ip}`, 5, 86400);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update({ age_verified: true })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Age verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
