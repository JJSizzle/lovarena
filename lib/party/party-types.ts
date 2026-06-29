export type PartyGameMode = "prompts" | "trivia" | "hangout";
export type PartyStatus = "lobby" | "playing" | "ended";
export type PartyPhase = "waiting" | "voting" | "reveal" | "discussion";

export type TriviaOption = {
  id: string;
  text: string;
};

export type PartyMemberView = {
  id: string;
  username: string;
  avatarUrl: string | null;
  avatarEmoji: string;
  role: "host" | "member";
  isYou: boolean;
};

export type PartyVoteView = {
  profileId: string;
  username: string;
  optionId: string;
};

export type PartyTriviaScoreView = {
  profileId: string;
  username: string;
  score: number;
  isYou: boolean;
};

export type PartyMessageView = {
  id: string;
  senderId: string;
  username: string;
  content: string;
  createdAt: string;
  isYou: boolean;
};

export type PartyState = {
  id: string;
  inviteCode: string;
  status: PartyStatus;
  gameMode: PartyGameMode;
  maxPlayers: number;
  roundIndex: number;
  phase: PartyPhase;
  currentPrompt: string | null;
  currentOptions: TriviaOption[] | null;
  correctOptionId: string | null;
  votingDeadlineAt: string | null;
  members: PartyMemberView[];
  votes: PartyVoteView[];
  myVote: string | null;
  triviaScores: PartyTriviaScoreView[];
  isHost: boolean;
  canStart: boolean;
  inviteUrl: string;
};

export type PartyRoomRow = {
  id: string;
  host_id: string;
  invite_code: string;
  status: PartyStatus;
  game_mode: PartyGameMode;
  max_players: number;
  round_index: number;
  phase: PartyPhase;
  current_prompt: string | null;
  current_options: TriviaOption[] | null;
  correct_option_id: string | null;
  voting_deadline_at: string | null;
  last_scored_round: number;
  created_at: string;
  updated_at: string;
};
