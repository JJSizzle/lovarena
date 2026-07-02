import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import { processQualifiedChat } from "@/lib/referral/process-qualified-chat";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { parseOptionalJsonBody } from "@/lib/api/parse-json-body";

async function clearSession(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  await supabase.from("waiting_users").delete().eq("user_id", userId);
  await supabase.from("user_presence").upsert({
    user_id: userId,
    last_seen_at: new Date().toISOString(),
    in_queue: false,
    in_chat: false,
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const parsed = await parseOptionalJsonBody<{ roomId?: string }>(req);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const roomId =
      typeof body.roomId === "string" && body.roomId.length > 0
        ? body.roomId
        : null;

    const ip = clientIp(req);
    const rl = await rateLimit(`leave:${auth.profile.id}:${ip}`, 30, 60);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const supabase = createAdminClient();
    let referralReward: { rewarded: boolean; message: string } | null = null;

    if (roomId) {
      const membership = await assertRoomMember(roomId, auth.profile.id);
      if ("error" in membership) return membership.error;

      referralReward = await processQualifiedChat(
        supabase,
        auth.profile.id,
        roomId
      );

      await supabase.rpc("leave_chat", {
        p_user_id: auth.profile.id,
        p_room_id: roomId,
      });
    }

    await clearSession(supabase, auth.profile.id);

    return NextResponse.json({ ok: true, referralReward });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Leave chat request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
