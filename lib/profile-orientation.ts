import { isPlaceholderUsername } from "@/lib/username";

export const GENDER_IDENTITIES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-Binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const LOOKING_FOR_OPTIONS = [
  { value: "straight_men", label: "Straight Men" },
  { value: "straight_women", label: "Straight Women" },
  { value: "gay_men", label: "Gay Men" },
  { value: "lesbian_women", label: "Lesbian Women" },
  { value: "everyone", label: "Everyone" },
] as const;

/** User-facing "I want to meet" choices (maps to LookingFor via encodeMeetPreference). */
export const MEET_PREFERENCE_OPTIONS = [
  { value: "women", label: "Women", group: "simple" as const },
  { value: "men", label: "Men", group: "simple" as const },
  { value: "anyone", label: "Anyone", group: "simple" as const },
  { value: "gay_men", label: "Gay men", group: "more" as const },
  {
    value: "lesbian_women",
    label: "Lesbian women",
    group: "more" as const,
  },
] as const;

export type GenderIdentity = (typeof GENDER_IDENTITIES)[number]["value"];
export type LookingFor = (typeof LOOKING_FOR_OPTIONS)[number]["value"];
export type MeetPreference = (typeof MEET_PREFERENCE_OPTIONS)[number]["value"];

/** Default meet preference for new users (open matching). */
export const DEFAULT_LOOKING_FOR: LookingFor = "everyone";

const GENDER_SET = new Set<string>(GENDER_IDENTITIES.map((o) => o.value));
const LOOKING_FOR_SET = new Set<string>(LOOKING_FOR_OPTIONS.map((o) => o.value));
const MEET_PREFERENCE_SET = new Set<string>(
  MEET_PREFERENCE_OPTIONS.map((o) => o.value)
);

export function isMeetPreference(value: unknown): value is MeetPreference {
  return typeof value === "string" && MEET_PREFERENCE_SET.has(value);
}

/** DB looking_for → UI dropdown value. */
export function meetPreferenceFromLookingFor(
  lookingFor: LookingFor | null | undefined
): MeetPreference | "" {
  if (!lookingFor) return "";
  switch (lookingFor) {
    case "straight_women":
      return "women";
    case "straight_men":
      return "men";
    case "gay_men":
      return "gay_men";
    case "lesbian_women":
      return "lesbian_women";
    case "everyone":
      return "anyone";
    default:
      return "";
  }
}

/** UI dropdown value + gender → DB looking_for for mutual matching. */
export function encodeMeetPreference(
  preference: MeetPreference,
  gender: GenderIdentity
): LookingFor {
  if (preference === "anyone") return "everyone";
  if (preference === "gay_men") return "gay_men";
  if (preference === "lesbian_women") return "lesbian_women";

  if (preference === "women") {
    if (gender === "male") return "straight_women";
    if (gender === "female") return "lesbian_women";
    return "everyone";
  }

  if (preference === "men") {
    if (gender === "male") return "gay_men";
    if (gender === "female") return "straight_men";
    return "everyone";
  }

  return "everyone";
}

export function meetPreferenceLabel(
  preference: MeetPreference | null | undefined
): string {
  return (
    MEET_PREFERENCE_OPTIONS.find((o) => o.value === preference)?.label ?? "—"
  );
}

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

export { isValidUsername, validateUsername, isPlaceholderUsername } from "@/lib/username";

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

export function isOnboardingComplete(profile: {
  username: string;
  gender_identity?: string | null;
  looking_for?: string | null;
  age?: number | null;
}): boolean {
  return (
    isArenaProfileComplete(profile) &&
    !isPlaceholderUsername(profile.username)
  );
}

export function genderLabel(value: GenderIdentity | null | undefined): string {
  return GENDER_IDENTITIES.find((o) => o.value === value)?.label ?? "—";
}

/** Gender shown to other users (hides "prefer not to say"). */
export function publicGenderLabel(
  value: GenderIdentity | null | undefined
): string | null {
  if (!value || value === "prefer_not_to_say") return null;
  return genderLabel(value);
}

export function lookingForLabel(value: LookingFor | null | undefined): string {
  const pref = meetPreferenceFromLookingFor(value);
  if (pref) return meetPreferenceLabel(pref);
  return "—";
}
