import { REP_PARTY_HOST_MIN, REP_TRUSTED_MIN, reputationTier } from "@/lib/reputation";
import {
  AMBASSADOR_REFERRALS,
  CONNECTOR_REFERRALS,
} from "@/lib/referral/badges";

export const STREAK_MILESTONES = [7, 14, 30] as const;
export const REP_SCORE_MILESTONES = [150, 250, REP_PARTY_HOST_MIN, REP_TRUSTED_MIN] as const;

export type MilestoneToast = {
  id: string;
  title: string;
  body: string;
};

function crossed(prev: number, next: number, threshold: number): boolean {
  return prev < threshold && next >= threshold;
}

function milestoneSeen(id: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(`lovarena_milestone_${id}`) === "1";
  } catch {
    return false;
  }
}

export function markMilestoneSeen(id: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`lovarena_milestone_${id}`, "1");
  } catch {
    // ignore
  }
}

export function detectMilestones(
  prev: {
    streak: number;
    rep: number;
    referrals: number;
    partyHostUnlocked: boolean;
  },
  next: {
    streak: number;
    rep: number;
    referrals: number;
    partyHostUnlocked: boolean;
  }
): MilestoneToast | null {
  for (const day of STREAK_MILESTONES) {
    if (crossed(prev.streak, next.streak, day)) {
      const id = `streak-${day}`;
      if (milestoneSeen(id)) continue;
      return {
        id,
        title: `${day}-day streak!`,
        body:
          day >= 30
            ? "You're on fire — keep showing up in the arena."
            : day >= 14
              ? "Two weeks strong. Nice consistency."
              : "One week of daily chats. Great habit!",
      };
    }
  }

  for (const score of REP_SCORE_MILESTONES) {
    if (crossed(prev.rep, next.rep, score)) {
      const id = `rep-${score}`;
      if (milestoneSeen(id)) continue;
      if (score === REP_PARTY_HOST_MIN) {
        return {
          id,
          title: "Party host unlocked",
          body: `You hit ${REP_PARTY_HOST_MIN} reputation — you can host friend parties now.`,
        };
      }
      return {
        id,
        title: `${reputationTier(score)} reputation`,
        body: `You reached ${score} reputation. Keep it up!`,
      };
    }
  }

  if (
    crossed(prev.referrals, next.referrals, CONNECTOR_REFERRALS) &&
    next.referrals < AMBASSADOR_REFERRALS
  ) {
    const id = "referral-connector";
    if (!milestoneSeen(id)) {
      return {
        id,
        title: "Connector badge",
        body: `${CONNECTOR_REFERRALS} friends joined from your invite link.`,
      };
    }
  }

  if (crossed(prev.referrals, next.referrals, AMBASSADOR_REFERRALS)) {
    const id = "referral-ambassador";
    if (!milestoneSeen(id)) {
      return {
        id,
        title: "Ambassador badge",
        body: `${AMBASSADOR_REFERRALS} qualified referrals — you're growing Lovarena!`,
      };
    }
  }

  return null;
}
