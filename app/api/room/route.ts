import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  getPartnerId,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import { endRoomIfPartnerGone } from "@/lib/partner-gone";

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

    let { room } = membership;
    const partnerId = getPartnerId(room, auth.profile.id);

    if (room.status === "active" && partnerId) {
      const supabase = createAdminClient();
      const { data: roomRow } = await supabase
        .from("chat_rooms")
        .select("created_at")
        .eq("id", roomId)
        .maybeSingle();

      if (roomRow?.created_at) {
        const ended = await endRoomIfPartnerGone(
          roomId,
          roomRow.created_at,
          partnerId
        );
        if (ended) {
          room = { ...room, status: "ended" };
        }
      }
    }

    return NextResponse.json({
      roomId: room.id,
      status: room.status,
      user1_id: room.user1_id,
      user2_id: room.user2_id,
      partnerId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Room lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
