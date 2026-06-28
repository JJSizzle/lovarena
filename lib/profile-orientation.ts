export const GENDER_IDENTITIES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-Binary" },
] as const;

export const LOOKING_FOR_OPTIONS = [
  { value: "straight_men", label: "Straight Men" },
  { value: "straight_women", label: "Straight Women" },
  { value: "gay_men", label: "Gay Men" },
  { value: "lesbian_women", label: "Lesbian Women" },
  { value: "everyone", label: "Everyone" },
] as const;

export type GenderIdentity = (typeof GENDER_IDENTITIES)[number]["value"];
export type LookingFor = (typeof LOOKING_FOR_OPTIONS)[number]["value"];

const GENDER_SET = new Set<string>(GENDER_IDENTITIES.map((o) => o.value));
const LOOKING_FOR_SET = new Set<string>(LOOKING_FOR_OPTIONS.map((o) => o.value));

export function isGenderIdentity(value: unknown): value is GenderIdentity {
  return typeof value === "string" && GENDER_SET.has(value);
}

export function isLookingFor(value: unknown): value is LookingFor {
  return typeof value === "string" && LOOKING_FOR_SET.has(value);
}

export function isOrientationProfileComplete(profile: {
  gender_identity?: string | null;
  looking_for?: string | null;
}): boolean {
  return (
    isGenderIdentity(profile.gender_identity) &&
    isLookingFor(profile.looking_for)
  );
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/;

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

export function isArenaProfileComplete(profile: {
  gender_identity?: string | null;
  looking_for?: string | null;
  age?: number | null;
}): boolean {
  return (
    isOrientationProfileComplete(profile) &&
    typeof profile.age === "number" &&
    profile.age >= 18
  );
}

export function genderLabel(value: GenderIdentity | null | undefined): string {
  return GENDER_IDENTITIES.find((o) => o.value === value)?.label ?? "—";
}

export function lookingForLabel(value: LookingFor | null | undefined): string {
  return LOOKING_FOR_OPTIONS.find((o) => o.value === value)?.label ?? "—";
}
