import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { generateInviteCode } from "@/lib/party/game-content";
import { areFriends } from "@/lib/party/party-auth";
import { buildPartyState, syncPartyRoom } from "@/lib/party/party-state";
import type { PartyGameMode } from "@/lib/party/party-types";

function isGameMode(value: unknown): value is PartyGameMode {
  return value === "prompts" || value === "trivia" || value === "hangout";
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const partyId = req.nextUrl.searchParams.get("partyId");
    const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();

    if (!partyId && !code) {
      return NextResponse.json(
        { error: "Provide partyId or code." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    let query = supabase.from("party_rooms").select("*");

    if (partyId) {
      query = query.eq("id", partyId);
    } else {
      query = query.eq("invite_code", code!);
    }

    const { data: room, error } = await query.maybeSingle();
    if (error || !room) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    const { data: member } = await supabase
      .from("party_members")
      .select("profile_id")
      .eq("party_id", room.id)
      .eq("profile_id", auth.profile.id)
      .maybeSingle();

    const origin = req.nextUrl.origin;

    if (member) {
      const synced = await syncPartyRoom(supabase, room);
      const party = await buildPartyState(
        supabase,
        synced,
        auth.profile.id,
        origin
      );
      return NextResponse.json({ party, isMember: true });
    }

    if (room.status === "ended") {
      return NextResponse.json({ error: "This party has ended." }, { status: 410 });
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

    return NextResponse.json({
      party: {
        id: room.id,
        inviteCode: room.invite_code,
        status: room.status,
        gameMode: room.game_mode,
        maxPlayers: room.max_players,
        memberCount: count ?? 0,
        inviteUrl: `${origin}/party?code=${room.invite_code}`,
      },
      isMember: false,
      canJoin: (count ?? 0) < room.max_players,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Party load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const gameMode = body.gameMode;
    const maxPlayers = Number(body.maxPlayers ?? 4);

    if (!isGameMode(gameMode)) {
      return NextResponse.json({ error: "Invalid game mode" }, { status: 400 });
    }
    if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 4) {
      return NextResponse.json(
        { error: "Party size must be 2–4 players." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: memberRows } = await supabase
      .from("party_members")
      .select("party_id")
      .eq("profile_id", auth.profile.id);

    const partyIds = (memberRows ?? []).map((r) => r.party_id);
    if (partyIds.length) {
      const { data: activeRooms } = await supabase
        .from("party_rooms")
        .select("id, status")
        .in("id", partyIds)
        .in("status", ["lobby", "playing"]);

      if (activeRooms?.length) {
        return NextResponse.json(
          {
            error: "Leave your current party before starting a new one.",
            partyId: activeRooms[0].id,
          },
          { status: 409 }
        );
      }
    }

    let inviteCode = generateInviteCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: created, error } = await supabase
        .from("party_rooms")
        .insert({
          host_id: auth.profile.id,
          invite_code: inviteCode,
          game_mode: gameMode,
          max_players: maxPlayers,
        })
        .select("*")
        .single();

      if (!error && created) {
        await supabase.from("party_members").insert({
          party_id: created.id,
          profile_id: auth.profile.id,
          role: "host",
        });

        const party = await buildPartyState(
          supabase,
          created,
          auth.profile.id,
          req.nextUrl.origin
        );
        return NextResponse.json({ party });
      }

      if (error?.code === "23505") {
        inviteCode = generateInviteCode();
        continue;
      }

      return NextResponse.json(
        { error: error?.message ?? "Could not create party" },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Could not create party" }, { status: 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Party create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
