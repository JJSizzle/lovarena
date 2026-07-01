import { rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import type { NextResponse } from "next/server";

const NEW_ACCOUNT_MS = 24 * 60 * 60 * 1000;

export type RateTier = {
  maxHits: number;
  windowSeconds: number;
};

export function isNewAccount(createdAt: string | null | undefined): boolean {
  if (!createdAt) return true;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs >= 0 && ageMs < NEW_ACCOUNT_MS;
}

export async function applyTieredRateLimit(
  bucketPrefix: string,
  profileId: string,
  ip: string,
  profileCreatedAt: string,
  tiers: { established: RateTier; newAccount: RateTier }
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  const tier = isNewAccount(profileCreatedAt)
    ? tiers.newAccount
    : tiers.established;

  const rl = await rateLimit(
    `${bucketPrefix}:${profileId}:${ip}`,
    tier.maxHits,
    tier.windowSeconds
  );

  if (!rl.allowed) {
    return {
      allowed: false,
      response: rateLimitResponse(rl.retryAfterSeconds),
    };
  }

  return { allowed: true };
}

export async function applyIpRateLimit(
  bucketPrefix: string,
  ip: string,
  tier: RateTier
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  const rl = await rateLimit(
    `${bucketPrefix}:${ip}`,
    tier.maxHits,
    tier.windowSeconds
  );

  if (!rl.allowed) {
    return {
      allowed: false,
      response: rateLimitResponse(rl.retryAfterSeconds),
    };
  }

  return { allowed: true };
}

export const MATCH_RATE_TIERS = {
  established: { maxHits: 30, windowSeconds: 60 },
  newAccount: { maxHits: 10, windowSeconds: 60 },
} as const;

export const MATCH_IP_RATE = { maxHits: 45, windowSeconds: 60 } as const;

export const NEXT_RATE_TIERS = {
  established: { maxHits: 20, windowSeconds: 60 },
  newAccount: { maxHits: 8, windowSeconds: 60 },
} as const;

export const MESSAGE_RATE_TIERS = {
  established: { maxHits: 60, windowSeconds: 60 },
  newAccount: { maxHits: 25, windowSeconds: 60 },
} as const;

export const PARTY_MESSAGE_RATE_TIERS = {
  established: { maxHits: 60, windowSeconds: 3600 },
  newAccount: { maxHits: 20, windowSeconds: 3600 },
} as const;
