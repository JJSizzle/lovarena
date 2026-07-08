import type { SupabaseClient } from "@supabase/supabase-js";
import { isLowReputation } from "@/lib/reputation-gating";

export const MATCH_POLL_MS_NORMAL = 3000;
export const MATCH_POLL_MS_LOW_REP = 5000;
export const MATCH_POLL_MS_MAX = 10_000;

export function matchPollIntervalMs(score: number): number {
  return isLowReputation(score) ? MATCH_POLL_MS_LOW_REP : MATCH_POLL_MS_NORMAL;
}

/** Server hint: stretch polls when the global queue is deep. */
export function matchPollIntervalForQueue(
  queueSize: number,
  reputationScore: number
): number {
  const base = matchPollIntervalMs(reputationScore);
  if (queueSize >= 300) return MATCH_POLL_MS_MAX;
  if (queueSize >= 150) return 7000;
  if (queueSize >= 75) return 5500;
  if (queueSize >= 30) return 4000;
  return base;
}

/** Client backoff after consecutive waits without a match. */
export function matchPollBackoffMs(
  consecutiveWaits: number,
  baseMs: number
): number {
  if (consecutiveWaits <= 0) return baseMs;
  const scaled = Math.round(baseMs * (1 + consecutiveWaits * 0.2));
  return Math.min(scaled, MATCH_POLL_MS_MAX);
}

type QueueCache = { count: number; at: number };

const QUEUE_CACHE_TTL_MS = 10_000;

export async function getWaitingQueueSize(
  supabase: SupabaseClient
): Promise<number> {
  const g = globalThis as typeof globalThis & {
    __lovarenaQueueCache?: QueueCache;
  };
  const now = Date.now();
  const cached = g.__lovarenaQueueCache;
  if (cached && now - cached.at < QUEUE_CACHE_TTL_MS) {
    return cached.count;
  }

  const { count } = await supabase
    .from("waiting_users")
    .select("*", { count: "exact", head: true });

  const size = count ?? 0;
  g.__lovarenaQueueCache = { count: size, at: now };
  return size;
}
