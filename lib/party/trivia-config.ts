/** Seconds each trivia question stays open for voting. */
export const TRIVIA_VOTE_SECONDS = 15;

export function triviaVotingDeadline(): string {
  return new Date(Date.now() + TRIVIA_VOTE_SECONDS * 1000).toISOString();
}
