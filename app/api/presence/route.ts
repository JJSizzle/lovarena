import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<{ inQueue?: boolean; inChat?: boolean }>(req);
    if (!parsed.ok) return parsed.response;
    const { inQueue, inChat } = parsed.data;

    const ip = clientIp(req);
    const rl = await rateLimit(`presence:${auth.profile.id}:${ip}`, 120, 60);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from("user_presence").upsert({
      user_id: auth.profile.id,
      last_seen_at: new Date().toISOString(),
      in_queue: Boolean(inQueue),
      in_chat: Boolean(inChat),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Presence update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
