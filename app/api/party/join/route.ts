import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile, isBlockedEitherWay } from "@/lib/auth/api-auth";
import { areFriends } from "@/lib/party/party-auth";
import { buildPartyState } from "@/lib/party/party-state";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { inviteCode, partyId } = await req.json();
    const supabase = createAdminClient();

    let roomQuery = supabase.from("party_rooms").select("*");
    if (partyId) {
      roomQuery = roomQuery.eq("id", partyId);
    } else if (inviteCode) {
      roomQuery = roomQuery.eq(
        "invite_code",
        String(inviteCode).trim().toUpperCase()
      );
    } else {
      return NextResponse.json(
        { error: "Provide inviteCode or partyId." },
        { status: 400 }
      );
    }

    const { data: room, error } = await roomQuery.maybeSingle();
    if (error || !room) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    if (room.status === "ended") {
      return NextResponse.json({ error: "This party has ended." }, { status: 410 });
    }

    const { data: existing } = await supabase
      .from("party_members")
      .select("profile_id")
      .eq("party_id", room.id)
      .eq("profile_id", auth.profile.id)
      .maybeSingle();

    if (existing) {
      const party = await buildPartyState(
        supabase,
        room,
        auth.profile.id,
        req.nextUrl.origin
      );
      return NextResponse.json({ party });
    }

    if (await isBlockedEitherWay(auth.profile.id, room.host_id)) {
      return NextResponse.json({ error: "Cannot join this party." }, { status: 403 });
    }

    const friends = await areFriends(auth.profile.id, room.host_id);
    if (!friends) {
      return NextResponse.json(
        { error: "Party mode is friends only. Add the host as a friend first." },
        { status: 403 }
      );
    }

    const { count } = await supabase
      .from("party_members")
      .select("profile_id", { count: "exact", head: true })
      .eq("party_id", room.id);

    if ((count ?? 0) >= room.max_players) {
      return NextResponse.json({ error: "Party is full." }, { status: 409 });
    }

    const { error: joinError } = await supabase.from("party_members").insert({
      party_id: room.id,
      profile_id: auth.profile.id,
      role: "member",
    });

    if (joinError) {
      return NextResponse.json({ error: joinError.message }, { status: 500 });
    }

    const { data: refreshed } = await supabase
      .from("party_rooms")
      .select("*")
      .eq("id", room.id)
      .single();

    const party = await buildPartyState(
      supabase,
      refreshed ?? room,
      auth.profile.id,
      req.nextUrl.origin
    );

    return NextResponse.json({ party });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Join failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
