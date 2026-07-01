import type { createAdminClient } from "@/lib/supabase/admin";
import { triviaVotingDeadline } from "@/lib/party/trivia-config";
import type {
  PartyMemberView,
  PartyRoomRow,
  PartyState,
  PartyTriviaScoreView,
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

export async function loadTriviaScores(
  supabase: Supabase,
  partyId: string,
  members: PartyMemberView[],
  viewerId: string
): Promise<PartyTriviaScoreView[]> {
  const { data: rows } = await supabase
    .from("party_trivia_scores")
    .select("profile_id, score")
    .eq("party_id", partyId);

  const scoreById = new Map(
    (rows ?? []).map((row) => [row.profile_id, row.score as number])
  );

  return members
    .map((member) => ({
      profileId: member.id,
      username: member.username,
      score: scoreById.get(member.id) ?? 0,
      isYou: member.id === viewerId,
    }))
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
}

/** Award +1 for each correct vote this round (once per round). */
export async function awardTriviaRoundScores(
  supabase: Supabase,
  room: PartyRoomRow
): Promise<void> {
  if (room.game_mode !== "trivia" || !room.correct_option_id) return;

  const { data: claimed } = await supabase
    .from("party_rooms")
    .update({
      last_scored_round: room.round_index,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id)
    .or(
      `last_scored_round.is.null,last_scored_round.lt.${room.round_index}`
    )
    .select("id, correct_option_id, round_index")
    .maybeSingle();

  if (!claimed) return;

  const { data: votes } = await supabase
    .from("party_votes")
    .select("profile_id, option_id")
    .eq("party_id", room.id)
    .eq("round_index", claimed.round_index);

  for (const vote of votes ?? []) {
    if (vote.option_id !== claimed.correct_option_id) continue;

    const { data: existing } = await supabase
      .from("party_trivia_scores")
      .select("score")
      .eq("party_id", room.id)
      .eq("profile_id", vote.profile_id)
      .maybeSingle();

    await supabase.from("party_trivia_scores").upsert(
      {
        party_id: room.id,
        profile_id: vote.profile_id,
        score: (existing?.score ?? 0) + 1,
      },
      { onConflict: "party_id,profile_id" }
    );
  }
}

export async function buildPartyState(
  supabase: Supabase,
  room: PartyRoomRow,
  viewerId: string,
  origin?: string
): Promise<PartyState> {
  const members = await loadPartyMembers(supabase, room.id, viewerId);
  const triviaScores =
    room.game_mode === "trivia" && room.status === "playing"
      ? await loadTriviaScores(supabase, room.id, members, viewerId)
      : [];
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
    votingDeadlineAt: room.voting_deadline_at ?? null,
    members,
    votes,
    myVote,
    triviaScores,
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
      voting_deadline_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id)
    .eq("phase", "voting")
    .select("*")
    .maybeSingle();

  if (error || !updated) return null;
  await awardTriviaRoundScores(supabase, updated as PartyRoomRow);
  return updated as PartyRoomRow;
}

export async function maybeAdvanceTriviaOnTimeout(
  supabase: Supabase,
  room: PartyRoomRow
): Promise<PartyRoomRow | null> {
  if (room.game_mode !== "trivia" || room.phase !== "voting") return null;
  if (!room.voting_deadline_at) return null;
  if (new Date(room.voting_deadline_at).getTime() > Date.now()) return null;

  const { data: updated, error } = await supabase
    .from("party_rooms")
    .update({
      phase: "reveal",
      voting_deadline_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id)
    .eq("phase", "voting")
    .select("*")
    .maybeSingle();

  if (error || !updated) return null;
  await awardTriviaRoundScores(supabase, updated as PartyRoomRow);
  return updated as PartyRoomRow;
}

/** Apply vote-count and timer advances before returning room state. */
export async function syncPartyRoom(
  supabase: Supabase,
  room: PartyRoomRow
): Promise<PartyRoomRow> {
  let current = room;
  const byVotes = await maybeAdvanceTriviaRound(supabase, current);
  if (byVotes) current = byVotes;
  const byTimeout = await maybeAdvanceTriviaOnTimeout(supabase, current);
  if (byTimeout) current = byTimeout;
  return current;
}

/** Host skips the current trivia question (awards points then loads next). */
export async function skipTriviaQuestion(
  supabase: Supabase,
  room: PartyRoomRow
): Promise<PartyRoomRow | null> {
  if (room.game_mode !== "trivia") return null;
  if (room.phase !== "voting" && room.phase !== "reveal") return null;

  if (room.phase === "voting") {
    await awardTriviaRoundScores(supabase, room);
  }

  return startNextRound(supabase, room);
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
        voting_deadline_at: null,
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
      voting_deadline_at: triviaVotingDeadline(),
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
  if (room.game_mode === "hangout") {
    const { data: updated, error } = await supabase
      .from("party_rooms")
      .update({
        status: "playing",
        round_index: 0,
        phase: "waiting",
        current_prompt: null,
        current_options: null,
        correct_option_id: null,
        voting_deadline_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id)
      .select("*")
      .single();

    if (error || !updated) return null;
    return updated as PartyRoomRow;
  }

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
        voting_deadline_at: null,
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
      voting_deadline_at: triviaVotingDeadline(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id)
    .select("*")
    .single();

  if (error || !updated) return null;
  return updated as PartyRoomRow;
}
