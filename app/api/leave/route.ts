import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRoomMember, requireAuthProfile } from "@/lib/auth/api-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { roomId } = await req.json();
    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const membership = await assertRoomMember(roomId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const ip = clientIp(req);
    const rl = await rateLimit(`leave:${auth.profile.id}:${ip}`, 20, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const supabase = createAdminClient();
    await supabase.rpc("leave_chat", {
      p_user_id: auth.profile.id,
      p_room_id: roomId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Leave chat request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
