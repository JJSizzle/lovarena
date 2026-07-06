import { REP_TRUSTED_MIN } from "@/lib/reputation";

export type SafetyTone = "green" | "amber" | "sky" | "violet";

export function getSafetyLabel(profile: {
  reputation_score?: number;
  created_at?: string;
  age_verified?: boolean;
  id_verified?: boolean;
}): { label: string; tone: SafetyTone } {
  const created = profile.created_at ? new Date(profile.created_at) : null;
  const daysOld = created
    ? (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  const rep = profile.reputation_score ?? 100;

  if (daysOld < 3) {
    return { label: "New account", tone: "amber" };
  }
  if (rep >= REP_TRUSTED_MIN && profile.id_verified) {
    return { label: "Trusted member", tone: "green" };
  }
  if (profile.id_verified) {
    return { label: "ID verified", tone: "violet" };
  }
  if (profile.age_verified) {
    return { label: "18+ attested", tone: "sky" };
  }
  return { label: "Unverified", tone: "amber" };
}

export function overlapTags(a: string[] = [], b: string[] = []): string[] {
  return a.filter((tag) => b.includes(tag)).slice(0, 4);
}
