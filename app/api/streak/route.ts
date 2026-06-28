import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const ip = clientIp(req);
    const rl = await rateLimit(`streak:${auth.profile.id}:${ip}`, 10, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("bump_chat_streak", {
      p_user_id: auth.profile.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ streak: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Streak update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
