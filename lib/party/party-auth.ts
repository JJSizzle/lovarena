import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PartyRoomRow } from "@/lib/party/party-types";

export async function areFriends(
  userA: string,
  userB: string
): Promise<boolean> {
  if (userA === userB) return true;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(user_id.eq.${userA},friend_id.eq.${userB}),and(user_id.eq.${userB},friend_id.eq.${userA})`
    )
    .limit(1);

  return Boolean(data?.length);
}

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
