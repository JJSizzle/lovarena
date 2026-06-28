import { REP_TRUSTED_MIN } from "@/lib/reputation";

export function getSafetyLabel(profile: {
  reputation_score?: number;
  created_at?: string;
  age_verified?: boolean;
}): { label: string; tone: "green" | "amber" | "sky" } {
  const created = profile.created_at ? new Date(profile.created_at) : null;
  const daysOld = created
    ? (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  const rep = profile.reputation_score ?? 100;

  if (daysOld < 3) {
    return { label: "New account", tone: "amber" };
  }
  if (rep >= REP_TRUSTED_MIN && profile.age_verified) {
    return { label: "Trusted member", tone: "green" };
  }
  if (profile.age_verified) {
    return { label: "Verified 18+", tone: "sky" };
  }
  return { label: "Unverified", tone: "amber" };
}

export function overlapTags(a: string[] = [], b: string[] = []): string[] {
  return a.filter((tag) => b.includes(tag)).slice(0, 4);
}
