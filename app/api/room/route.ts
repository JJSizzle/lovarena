import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRoomMember, requireAuthProfile } from "@/lib/auth/api-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const roomId = req.nextUrl.searchParams.get("roomId");
    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const membership = await assertRoomMember(roomId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const { room } = membership;

    return NextResponse.json({
      roomId: room.id,
      status: room.status,
      user1_id: room.user1_id,
      user2_id: room.user2_id,
      partnerId:
        room.user1_id === auth.profile.id ? room.user2_id : room.user1_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Room lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
