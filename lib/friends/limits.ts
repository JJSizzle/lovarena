import type { SupabaseClient } from "@supabase/supabase-js";
import { countAcceptedFriends } from "@/lib/friends/are-friends";

/** Soft cap — prevents list spam and abuse; most users never hit this. */
export const MAX_FRIENDS = 200;

export function friendLimitMessage(current: number): string {
  return `Friend list is full (${current}/${MAX_FRIENDS}). Remove someone before adding more.`;
}

export function isAtFriendLimit(count: number): boolean {
  return count >= MAX_FRIENDS;
}

export async function assertFriendCapacityForPair(
  supabase: SupabaseClient,
  userA: string,
  userB: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [countA, countB] = await Promise.all([
    countAcceptedFriends(userA, supabase),
    countAcceptedFriends(userB, supabase),
  ]);

  if (isAtFriendLimit(countA)) {
    return { ok: false, error: friendLimitMessage(countA) };
  }

  if (isAtFriendLimit(countB)) {
    return {
      ok: false,
      error: `Their friend list is full (${countB}/${MAX_FRIENDS}).`,
    };
  }

  return { ok: true };
}
