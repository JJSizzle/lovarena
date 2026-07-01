import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { areFriends } from "@/lib/friends/are-friends";
import type { PartyRoomRow } from "@/lib/party/party-types";

export { areFriends } from "@/lib/friends/are-friends";

export async function assertPartyMember(
  partyId: string,
  userId: string
): Promise<
  | {
      ok: true;
      room: PartyRoomRow;
      role: "host" | "member";
    }
  | { error: NextResponse }
> {
  const supabase = createAdminClient();
  const { data: room, error } = await supabase
    .from("party_rooms")
    .select("*")
    .eq("id", partyId)
    .maybeSingle();

  if (error || !room) {
    return {
      error: NextResponse.json({ error: "Party not found" }, { status: 404 }),
    };
  }

  if (room.status === "ended") {
    return {
      error: NextResponse.json({ error: "This party has ended." }, { status: 410 }),
    };
  }

  const { data: member } = await supabase
    .from("party_members")
    .select("role")
    .eq("party_id", partyId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (!member) {
    return {
      error: NextResponse.json(
        { error: "You are not in this party." },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    room: room as PartyRoomRow,
    role: member.role as "host" | "member",
  };
}

export async function assertPartyHost(
  partyId: string,
  userId: string
): Promise<
  | { ok: true; room: PartyRoomRow }
  | { error: NextResponse }
> {
  const membership = await assertPartyMember(partyId, userId);
  if ("error" in membership) return membership;
  if (membership.role !== "host") {
    return {
      error: NextResponse.json(
        { error: "Only the host can do that." },
        { status: 403 }
      ),
    };
  }
  return { ok: true, room: membership.room };
}
