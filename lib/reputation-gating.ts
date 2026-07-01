import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  REP_LOW_MAX,
  REP_PARTY_HOST_MIN,
  REP_PARTY_HOST_REVOKE,
  clampReputation,
  reputationTier,
} from "@/lib/reputation";

export { REP_LOW_MAX, REP_PARTY_HOST_MIN, REP_PARTY_HOST_REVOKE };

export const MATCH_POLL_MS_NORMAL = 2000;
export const MATCH_POLL_MS_LOW_REP = 5000;

export function isLowReputation(score: number): boolean {
  return clampReputation(score) <= REP_LOW_MAX;
}

export function shouldMarkPartyHostUnlocked(score: number): boolean {
  return clampReputation(score) >= REP_PARTY_HOST_MIN;
}

/** Unlock at 125; keep hosting down to 75 if previously unlocked. */
export function canHostParty(
  score: number,
  partyHostUnlocked: boolean
): boolean {
  const rep = clampReputation(score);
  if (rep < REP_PARTY_HOST_REVOKE) return false;
  if (rep >= REP_PARTY_HOST_MIN) return true;
  return partyHostUnlocked;
}

export function matchPollIntervalMs(score: number): number {
  return isLowReputation(score) ? MATCH_POLL_MS_LOW_REP : MATCH_POLL_MS_NORMAL;
}

export function partyHostBlockMessage(
  score: number,
  partyHostUnlocked: boolean
): string {
  const rep = clampReputation(score);
  const tier = reputationTier(rep);

  if (rep < REP_PARTY_HOST_REVOKE) {
    if (partyHostUnlocked) {
      return `Party hosting pauses below ${REP_PARTY_HOST_REVOKE} reputation. You're at ${rep}/500 (${tier}) — build trust back up to host again.`;
    }
    return `Party hosting and fast matching unlock above ${REP_LOW_MAX} reputation. You're at ${rep}/500 (${tier}).`;
  }

  return `Party hosting unlocks at ${REP_PARTY_HOST_MIN} reputation. You're at ${rep}/500 (${tier}) — chat positively and earn kudos to level up.`;
}

export function partyHostBlockPayload(
  score: number,
  partyHostUnlocked: boolean
) {
  const rep = clampReputation(score);
  return {
    error: partyHostBlockMessage(rep, partyHostUnlocked),
    needsReputation: true,
    reputationScore: rep,
    requiredScore: REP_PARTY_HOST_MIN,
    revokeBelow: REP_PARTY_HOST_REVOKE,
    partyHostUnlocked,
  };
}

export function lowRepRateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error:
        "Matching is limited while your reputation is low. Chat positively to level up.",
      lowReputation: true,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}

export async function syncPartyHostUnlock(
  supabase: SupabaseClient,
  profileId: string,
  reputationScore: number,
  currentlyUnlocked: boolean
): Promise<boolean> {
  if (!shouldMarkPartyHostUnlocked(reputationScore)) {
    return currentlyUnlocked;
  }

  if (!currentlyUnlocked) {
    await supabase
      .from("profiles")
      .update({ party_host_unlocked: true })
      .eq("id", profileId);
  }

  return true;
}

export function assertCanHostParty(
  reputationScore: number,
  partyHostUnlocked: boolean
): NextResponse | null {
  if (canHostParty(reputationScore, partyHostUnlocked)) return null;
  return NextResponse.json(
    partyHostBlockPayload(reputationScore, partyHostUnlocked),
    { status: 403 }
  );
}
