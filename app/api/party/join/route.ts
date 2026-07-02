import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile, isBlockedEitherWay } from "@/lib/auth/api-auth";
import { areFriends } from "@/lib/party/party-auth";
import { buildPartyState } from "@/lib/party/party-state";
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<{ inviteCode?: string; partyId?: string }>(req);
    if (!parsed.ok) return parsed.response;
    const { inviteCode, partyId } = parsed.data;
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

    const { data: joinStatus, error: joinError } = await supabase.rpc(
      "join_party_if_not_full",
      {
        p_party_id: room.id,
        p_profile_id: auth.profile.id,
      }
    );

    if (joinError) {
      const missingRpc =
        joinError.code === "PGRST202" ||
        joinError.message.toLowerCase().includes("join_party_if_not_full");

      if (!missingRpc) {
        return NextResponse.json({ error: joinError.message }, { status: 500 });
      }

      const { count } = await supabase
        .from("party_members")
        .select("profile_id", { count: "exact", head: true })
        .eq("party_id", room.id);

      if ((count ?? 0) >= room.max_players) {
        return NextResponse.json({ error: "Party is full." }, { status: 409 });
      }

      const { error: insertError } = await supabase.from("party_members").insert({
        party_id: room.id,
        profile_id: auth.profile.id,
        role: "member",
      });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      const { count: afterCount } = await supabase
        .from("party_members")
        .select("profile_id", { count: "exact", head: true })
        .eq("party_id", room.id);

      if ((afterCount ?? 0) > room.max_players) {
        await supabase
          .from("party_members")
          .delete()
          .eq("party_id", room.id)
          .eq("profile_id", auth.profile.id);
        return NextResponse.json({ error: "Party is full." }, { status: 409 });
      }
    } else if (joinStatus === "full") {
      return NextResponse.json({ error: "Party is full." }, { status: 409 });
    } else if (joinStatus === "ended") {
      return NextResponse.json({ error: "This party has ended." }, { status: 410 });
    } else if (joinStatus === "not_found") {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    } else if (joinStatus !== "ok") {
      return NextResponse.json({ error: "Could not join party." }, { status: 500 });
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
