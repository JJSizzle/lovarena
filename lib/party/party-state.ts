import type { createAdminClient } from "@/lib/supabase/admin";
import type {
  PartyMemberView,
  PartyRoomRow,
  PartyState,
  PartyVoteView,
  TriviaOption,
} from "@/lib/party/party-types";

type Supabase = ReturnType<typeof createAdminClient>;

export async function loadPartyMembers(
  supabase: Supabase,
  partyId: string,
  viewerId: string
): Promise<PartyMemberView[]> {
  const { data: rows } = await supabase
    .from("party_members")
    .select("profile_id, role")
    .eq("party_id", partyId)
    .order("joined_at", { ascending: true });

  const ids = (rows ?? []).map((r) => r.profile_id);
  if (!ids.length) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, avatar_emoji")
    .in("id", ids);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (rows ?? []).map((row) => {
    const profile = profileById.get(row.profile_id);
    return {
      id: row.profile_id,
      username: profile?.username ?? "Player",
      avatarUrl: profile?.avatar_url ?? null,
      avatarEmoji: profile?.avatar_emoji ?? "😎",
      role: row.role as "host" | "member",
      isYou: row.profile_id === viewerId,
    };
  });
}

export async function loadPartyVotes(
  supabase: Supabase,
  partyId: string,
  roundIndex: number
): Promise<PartyVoteView[]> {
  const { data: votes } = await supabase
    .from("party_votes")
    .select("profile_id, option_id")
    .eq("party_id", partyId)
    .eq("round_index", roundIndex);

  const ids = (votes ?? []).map((v) => v.profile_id);
  if (!ids.length) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", ids);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.username]));

  return (votes ?? []).map((vote) => ({
    profileId: vote.profile_id,
    username: nameById.get(vote.profile_id) ?? "Player",
    optionId: vote.option_id,
  }));
}

export async function buildPartyState(
  supabase: Supabase,
  room: PartyRoomRow,
  viewerId: string,
  origin?: string
): Promise<PartyState> {
  const members = await loadPartyMembers(supabase, room.id, viewerId);
  const votes =
    room.status === "playing"
      ? await loadPartyVotes(supabase, room.id, room.round_index)
      : [];

  const myVote =
    votes.find((v) => v.profileId === viewerId)?.optionId ?? null;
  const isHost = room.host_id === viewerId;

  const options = Array.isArray(room.current_options)
    ? (room.current_options as TriviaOption[])
    : null;

  const baseUrl = origin?.replace(/\/$/, "") ?? "";
  const inviteUrl = baseUrl
    ? `${baseUrl}/party?code=${room.invite_code}`
    : `/party?code=${room.invite_code}`;

  return {
    id: room.id,
    inviteCode: room.invite_code,
    status: room.status,
    gameMode: room.game_mode,
    maxPlayers: room.max_players,
    roundIndex: room.round_index,
    phase: room.phase,
    currentPrompt: room.current_prompt,
    currentOptions: options,
    correctOptionId: room.correct_option_id,
    members,
    votes,
    myVote,
    isHost,
    canStart: isHost && room.status === "lobby" && members.length >= 2,
    inviteUrl,
  };
}

export async function maybeAdvanceTriviaRound(
  supabase: Supabase,
  room: PartyRoomRow
): Promise<PartyRoomRow | null> {
  if (room.game_mode !== "trivia" || room.phase !== "voting") return null;

  const { count: memberCount } = await supabase
    .from("party_members")
    .select("profile_id", { count: "exact", head: true })
    .eq("party_id", room.id);

  const { count: voteCount } = await supabase
    .from("party_votes")
    .select("profile_id", { count: "exact", head: true })
    .eq("party_id", room.id)
    .eq("round_index", room.round_index);

  if (!memberCount || !voteCount || voteCount < memberCount) return null;

  const { data: updated, error } = await supabase
    .from("party_rooms")
    .update({
      phase: "reveal",
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id)
    .eq("phase", "voting")
    .select("*")
    .maybeSingle();

  if (error || !updated) return null;
  return updated as PartyRoomRow;
}

export async function startNextRound(
  supabase: Supabase,
  room: PartyRoomRow
): Promise<PartyRoomRow | null> {
  const nextIndex = room.round_index + 1;
  const { pickPrompt, pickTrivia } = await import("@/lib/party/game-content");

  if (room.game_mode === "prompts") {
    const prompt = pickPrompt(nextIndex, []);
    const { data: updated, error } = await supabase
      .from("party_rooms")
      .update({
        round_index: nextIndex,
        phase: "discussion",
        current_prompt: prompt,
        current_options: null,
        correct_option_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id)
      .select("*")
      .single();

    if (error || !updated) return null;
    return updated as PartyRoomRow;
  }

  const trivia = pickTrivia(nextIndex);
  const { data: updated, error } = await supabase
    .from("party_rooms")
    .update({
      round_index: nextIndex,
      phase: "voting",
      current_prompt: trivia.question,
      current_options: trivia.options,
      correct_option_id: trivia.correctId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id)
    .select("*")
    .single();

  if (error || !updated) return null;
  return updated as PartyRoomRow;
}

export async function startFirstRound(
  supabase: Supabase,
  room: PartyRoomRow
): Promise<PartyRoomRow | null> {
  const { pickPrompt, pickTrivia } = await import("@/lib/party/game-content");

  if (room.game_mode === "prompts") {
    const prompt = pickPrompt(0, []);
    const { data: updated, error } = await supabase
      .from("party_rooms")
      .update({
        status: "playing",
        round_index: 0,
        phase: "discussion",
        current_prompt: prompt,
        current_options: null,
        correct_option_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id)
      .select("*")
      .single();

    if (error || !updated) return null;
    return updated as PartyRoomRow;
  }

  const trivia = pickTrivia(0);
  const { data: updated, error } = await supabase
    .from("party_rooms")
    .update({
      status: "playing",
      round_index: 0,
      phase: "voting",
      current_prompt: trivia.question,
      current_options: trivia.options,
      correct_option_id: trivia.correctId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id)
    .select("*")
    .single();

  if (error || !updated) return null;
  return updated as PartyRoomRow;
}
