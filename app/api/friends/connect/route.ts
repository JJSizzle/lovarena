import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getPartnerProfileId(
  supabase: ReturnType<typeof createAdminClient>,
  roomId: string,
  sessionUserId: string
): Promise<string | null> {
  const { data: room } = await supabase
    .from("chat_rooms")
    .select("user1_id, user2_id")
    .eq("id", roomId)
    .maybeSingle();

  if (!room) return null;

  const partnerSessionId =
    room.user1_id === sessionUserId ? room.user2_id : room.user1_id;

  if (room.user1_id !== sessionUserId && room.user2_id !== sessionUserId) {
    return null;
  }

  const { data: link } = await supabase
    .from("room_session_links")
    .select("profile_id")
    .eq("session_user_id", partnerSessionId)
    .maybeSingle();

  return link?.profile_id ?? null;
}

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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const roomId = req.nextUrl.searchParams.get("roomId");
    const sessionUserId = req.nextUrl.searchParams.get("sessionUserId");

    if (!roomId || !sessionUserId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: myClick } = await supabase
      .from("room_connect_clicks")
      .select("id")
      .eq("room_id", roomId)
      .eq("profile_id", user.id)
      .maybeSingle();

    const partnerProfileId = await getPartnerProfileId(
      supabase,
      roomId,
      sessionUserId
    );

    let partnerClicked = false;
    if (partnerProfileId) {
      const { data: partnerClick } = await supabase
        .from("room_connect_clicks")
        .select("id")
        .eq("room_id", roomId)
        .eq("profile_id", partnerProfileId)
        .maybeSingle();
      partnerClicked = !!partnerClick;
    }

    const matched =
      partnerProfileId &&
      (await areFriends(supabase, user.id, partnerProfileId));

    let partnerUsername: string | null = null;
    if (partnerProfileId) {
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", partnerProfileId)
        .maybeSingle();
      partnerUsername = partnerProfile?.username ?? null;
    }

    return NextResponse.json({
      youClicked: !!myClick,
      partnerClicked,
      partnerProfileId,
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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to connect with strangers", needsAuth: true },
        { status: 401 }
      );
    }

    const { roomId, sessionUserId } = await req.json();
    if (!roomId || !sessionUserId) {
      return NextResponse.json({ error: "Missing roomId or sessionUserId" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: room } = await supabase
      .from("chat_rooms")
      .select("user1_id, user2_id, status")
      .eq("id", roomId)
      .maybeSingle();

    if (!room || room.status !== "active") {
      return NextResponse.json({ error: "Room not active" }, { status: 400 });
    }

    if (
      room.user1_id !== sessionUserId &&
      room.user2_id !== sessionUserId
    ) {
      return NextResponse.json({ error: "Not in this room" }, { status: 403 });
    }

    await supabase.from("room_session_links").upsert({
      session_user_id: sessionUserId,
      profile_id: user.id,
    });

    await supabase.from("room_connect_clicks").upsert({
      room_id: roomId,
      profile_id: user.id,
    });

    const partnerProfileId = await getPartnerProfileId(
      supabase,
      roomId,
      sessionUserId
    );

    if (!partnerProfileId) {
      return NextResponse.json({
        youClicked: true,
        partnerClicked: false,
        matched: false,
        waitingForPartner: true,
      });
    }

    const { data: partnerClick } = await supabase
      .from("room_connect_clicks")
      .select("id")
      .eq("room_id", roomId)
      .eq("profile_id", partnerProfileId)
      .maybeSingle();

    if (!partnerClick) {
      return NextResponse.json({
        youClicked: true,
        partnerClicked: false,
        matched: false,
        waitingForPartner: true,
        partnerProfileId,
      });
    }

    const alreadyFriends = await areFriends(
      supabase,
      user.id,
      partnerProfileId
    );

    if (!alreadyFriends) {
      await supabase.from("friendships").upsert(
        [
          { user_id: user.id, friend_id: partnerProfileId, status: "accepted" },
          { user_id: partnerProfileId, friend_id: user.id, status: "accepted" },
        ],
        { onConflict: "user_id,friend_id", ignoreDuplicates: true }
      );
    }

    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", partnerProfileId)
      .maybeSingle();

    return NextResponse.json({
      youClicked: true,
      partnerClicked: true,
      matched: true,
      partnerProfileId,
      partnerUsername: partnerProfile?.username ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
