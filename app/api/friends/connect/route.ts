import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  getPartnerId,
  isBlockedEitherWay,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import { friendLinkStatus } from "@/lib/friends/friend-link-status";
import type { FriendConnectionType } from "@/lib/friends/connection-type";
import {
  allowsFriendRequests,
  allowsMutualSpark,
} from "@/lib/social-privacy";

async function getAcceptedFriendship(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  partnerId: string
): Promise<{ connectionType: FriendConnectionType | null } | null> {
  const { data: rows } = await supabase
    .from("friendships")
    .select("user_id, friend_id, status, connection_type")
    .or(
      `and(user_id.eq.${userId},friend_id.eq.${partnerId}),and(user_id.eq.${partnerId},friend_id.eq.${userId})`
    );

  const accepted = (rows ?? []).find((row) => row.status === "accepted");
  if (!accepted) return null;

  return {
    connectionType: (accepted.connection_type ??
      null) as FriendConnectionType | null,
  };
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
        .select("username, allow_mutual_spark")
        .eq("id", partnerId)
        .maybeSingle();
      partnerUsername = partnerProfile?.username ?? null;
    }

    const matched =
      partnerId && (await areFriends(supabase, auth.profile.id, partnerId));
    const friendship = partnerId
      ? await getAcceptedFriendship(supabase, auth.profile.id, partnerId)
      : null;

    const { data: friendRows } = partnerId
      ? await supabase
          .from("friendships")
          .select("user_id, friend_id, status")
          .or(
            `and(user_id.eq.${auth.profile.id},friend_id.eq.${partnerId}),and(user_id.eq.${partnerId},friend_id.eq.${auth.profile.id})`
          )
      : { data: [] };

    return NextResponse.json({
      youClicked: !!myClick,
      partnerClicked,
      partnerProfileId: partnerId,
      partnerUsername,
      mutualSpark:
        !!myClick &&
        partnerClicked &&
        friendship?.connectionType === "mutual_connect",
      connectionType: friendship?.connectionType ?? null,
      friendStatus: partnerId
        ? friendLinkStatus(auth.profile.id, partnerId, friendRows ?? [])
        : "none",
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

    if (alreadyFriends) {
      await supabase
        .from("friendships")
        .update({ connection_type: "mutual_connect" })
        .or(
          `and(user_id.eq.${auth.profile.id},friend_id.eq.${partnerId}),and(user_id.eq.${partnerId},friend_id.eq.${auth.profile.id})`
        )
        .eq("status", "accepted");
    } else {
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
