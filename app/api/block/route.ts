import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  getPartnerId,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<{ roomId?: string }>(req);
    if (!parsed.ok) return parsed.response;
    const { roomId } = parsed.data;
    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const membership = await assertRoomMember(roomId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const blockedId = getPartnerId(membership.room, auth.profile.id);
    if (!blockedId) {
      return NextResponse.json({ error: "No user to block" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("user_blocks").upsert({
      blocker_id: auth.profile.id,
      blocked_id: blockedId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.rpc("leave_chat", {
      p_user_id: auth.profile.id,
      p_room_id: roomId,
    });

    return NextResponse.json({ ok: true, blockedUserId: blockedId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Block failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
