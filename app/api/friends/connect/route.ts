import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  getPartnerId,
  isBlockedEitherWay,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import {
  ensureMutualSparkFriendship,
  friendLinkStatus,
} from "@/lib/friends/friend-link-status";
import type { FriendConnectionType } from "@/lib/friends/connection-type";
import {
  allowsMutualSpark,
} from "@/lib/social-privacy";

async function bothSparkedInRoom(
  supabase: ReturnType<typeof createAdminClient>,
  roomId: string,
  userId: string,
  partnerId: string
): Promise<boolean> {
  const { data: clicks } = await supabase
    .from("room_connect_clicks")
    .select("profile_id")
    .eq("room_id", roomId);

  const ids = new Set((clicks ?? []).map((row) => row.profile_id));
  return ids.has(userId) && ids.has(partnerId);
}

async function partnerSparked(
  supabase: ReturnType<typeof createAdminClient>,
  roomId: string,
  partnerId: string
): Promise<boolean> {
  const { data: partnerClick } = await supabase
    .from("room_connect_clicks")
    .select("id")
    .eq("room_id", roomId)
    .eq("profile_id", partnerId)
    .maybeSingle();

  return !!partnerClick;
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
      partnerClicked = await partnerSparked(supabase, roomId, partnerId);

      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("username, allow_mutual_spark")
        .eq("id", partnerId)
        .maybeSingle();
      partnerUsername = partnerProfile?.username ?? null;
    }

    const bothSparked =
      !!partnerId && !!myClick && partnerClicked;

    if (bothSparked && partnerId) {
      try {
        await ensureMutualSparkFriendship(
          supabase,
          auth.profile.id,
          partnerId
        );
      } catch {
        // polling will retry
      }
    }

    const { data: friendRows } = partnerId
      ? await supabase
          .from("friendships")
          .select("user_id, friend_id, status, connection_type")
          .or(
            `and(user_id.eq.${auth.profile.id},friend_id.eq.${partnerId}),and(user_id.eq.${partnerId},friend_id.eq.${auth.profile.id})`
          )
      : { data: [] };

    const friendStatus = partnerId
      ? friendLinkStatus(auth.profile.id, partnerId, friendRows ?? [])
      : "none";

    const acceptedRow = (friendRows ?? []).find(
      (row) => row.status === "accepted"
    );
    const connectionType = (acceptedRow?.connection_type ??
      null) as FriendConnectionType | null;

    return NextResponse.json({
      youClicked: !!myClick,
      partnerClicked,
      partnerProfileId: partnerId,
      partnerUsername,
      mutualSpark: bothSparked && friendStatus === "friends",
      connectionType,
      friendStatus: bothSparked && friendStatus === "friends" ? "friends" : friendStatus,
      matched: friendStatus === "friends",
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

    if (!allowsMutualSpark(auth.profile.allow_mutual_spark)) {
      return NextResponse.json(
        {
          error:
            "Mutual spark is turned off in your settings. Enable it under Settings → Privacy to connect this way.",
        },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    const { data: partnerProfilePrefs } = await supabase
      .from("profiles")
      .select("username, allow_mutual_spark")
      .eq("id", partnerId)
      .maybeSingle();

    if (!allowsMutualSpark(partnerProfilePrefs?.allow_mutual_spark)) {
      return NextResponse.json(
        {
          error: `${partnerProfilePrefs?.username ?? "This user"} isn't accepting mutual spark right now.`,
        },
        { status: 403 }
      );
    }

    await supabase.from("room_connect_clicks").upsert({
      room_id: roomId,
      profile_id: auth.profile.id,
    });

    const partnerClicked = await partnerSparked(supabase, roomId, partnerId);
    const bothSparked = await bothSparkedInRoom(
      supabase,
      roomId,
      auth.profile.id,
      partnerId
    );

    if (!bothSparked) {
      return NextResponse.json({
        youClicked: true,
        partnerClicked,
        matched: false,
        waitingForPartner: true,
        partnerProfileId: partnerId,
      });
    }

    try {
      await ensureMutualSparkFriendship(
        supabase,
        auth.profile.id,
        partnerId
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create friendship";
      return NextResponse.json({ error: message }, { status: 500 });
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
      friendStatus: "friends",
      connectionType: "mutual_connect",
      partnerProfileId: partnerId,
      partnerUsername: partnerProfile?.username ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
