import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  getPartnerId,
  isBlockedEitherWay,
  requireAuthProfile,
} from "@/lib/auth/api-auth";

async function areFriends(
  supabase: ReturnType<typeof createAdminClient>,
  a: string,
  b: string
): Promise<boolean> {
  const { data } = await supabase
    .from("friendships")
    .select("id")
    .eq("user_id", a)
    .eq("friend_id", b)
    .eq("status", "accepted")
    .maybeSingle();

  return !!data;
}

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

    const supabase = createAdminClient();
    const partnerId = getPartnerId(membership.room, auth.profile.id);

    const { data: myClick } = await supabase
      .from("room_connect_clicks")
      .select("id")
      .eq("room_id", roomId)
      .eq("profile_id", auth.profile.id)
      .maybeSingle();

    let partnerClicked = false;
    let partnerUsername: string | null = null;

    if (partnerId) {
      const { data: partnerClick } = await supabase
        .from("room_connect_clicks")
        .select("id")
        .eq("room_id", roomId)
        .eq("profile_id", partnerId)
        .maybeSingle();
      partnerClicked = !!partnerClick;

      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", partnerId)
        .maybeSingle();
      partnerUsername = partnerProfile?.username ?? null;
    }

    const matched =
      partnerId && (await areFriends(supabase, auth.profile.id, partnerId));

    return NextResponse.json({
      youClicked: !!myClick,
      partnerClicked,
      partnerProfileId: partnerId,
      partnerUsername,
      matched: !!matched,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    if (membership.room.status !== "active") {
      return NextResponse.json({ error: "Room not active" }, { status: 400 });
    }

    const partnerId = getPartnerId(membership.room, auth.profile.id);
    if (!partnerId) {
      return NextResponse.json({ error: "Partner not found" }, { status: 400 });
    }

    if (await isBlockedEitherWay(auth.profile.id, partnerId)) {
      return NextResponse.json(
        { error: "Cannot connect with a blocked user." },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    await supabase.from("room_connect_clicks").upsert({
      room_id: roomId,
      profile_id: auth.profile.id,
    });

    const { data: partnerClick } = await supabase
      .from("room_connect_clicks")
      .select("id")
      .eq("room_id", roomId)
      .eq("profile_id", partnerId)
      .maybeSingle();

    if (!partnerClick) {
      return NextResponse.json({
        youClicked: true,
        partnerClicked: false,
        matched: false,
        waitingForPartner: true,
        partnerProfileId: partnerId,
      });
    }

    const alreadyFriends = await areFriends(
      supabase,
      auth.profile.id,
      partnerId
    );

    if (!alreadyFriends) {
      await supabase.from("friendships").upsert(
        [
          {
            user_id: auth.profile.id,
            friend_id: partnerId,
            status: "accepted",
            connection_type: "mutual_connect",
          },
          {
            user_id: partnerId,
            friend_id: auth.profile.id,
            status: "accepted",
            connection_type: "mutual_connect",
          },
        ],
        { onConflict: "user_id,friend_id" }
      );
    }

    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", partnerId)
      .maybeSingle();

    return NextResponse.json({
      youClicked: true,
      partnerClicked: true,
      matched: true,
      connectionType: "mutual_connect",
      partnerProfileId: partnerId,
      partnerUsername: partnerProfile?.username ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
