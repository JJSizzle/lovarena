import { getUsStateName } from "@/lib/us-states";

export type MatchMode = "regional" | "worldwide";

const MODE_KEY = "lovarena_match_mode";
const COUNTRY_KEY = "lovarena_country_code";
const STATE_KEY = "lovarena_state_code";
const PREFER_INTERESTS_KEY = "lovarena_prefer_shared_interests";
const PREFER_LANGUAGES_KEY = "lovarena_prefer_shared_languages";
const VERIFIED_ONLY_KEY = "lovarena_verified_only";

export function getMatchMode(): MatchMode {
  if (typeof window === "undefined") return "worldwide";
  const mode = sessionStorage.getItem(MODE_KEY);
  return mode === "regional" ? "regional" : "worldwide";
}

export function setMatchMode(mode: MatchMode) {
  sessionStorage.setItem(MODE_KEY, mode);
}

export function getCountryCode(): string {
  if (typeof window === "undefined") return "US";
  return sessionStorage.getItem(COUNTRY_KEY) ?? "US";
}

export function setCountryCode(code: string) {
  sessionStorage.setItem(COUNTRY_KEY, code);
}

export function getStateCode(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STATE_KEY) || null;
}

export function setStateCode(code: string | null) {
  if (!code) sessionStorage.removeItem(STATE_KEY);
  else sessionStorage.setItem(STATE_KEY, code);
}

export function getPreferSharedInterests(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PREFER_INTERESTS_KEY) === "true";
}

export function setPreferSharedInterests(enabled: boolean) {
  sessionStorage.setItem(PREFER_INTERESTS_KEY, enabled ? "true" : "false");
}

export function getPreferSharedLanguages(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PREFER_LANGUAGES_KEY) === "true";
}

export function setPreferSharedLanguages(enabled: boolean) {
  sessionStorage.setItem(PREFER_LANGUAGES_KEY, enabled ? "true" : "false");
}

export function getVerifiedOnly(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(VERIFIED_ONLY_KEY) === "true";
}

export function setVerifiedOnly(enabled: boolean) {
  sessionStorage.setItem(VERIFIED_ONLY_KEY, enabled ? "true" : "false");
}

export function getMatchPrefs() {
  return {
    matchMode: getMatchMode(),
    countryCode: getCountryCode(),
    stateCode: getStateCode(),
    preferSharedInterests: getPreferSharedInterests(),
    preferSharedLanguages: getPreferSharedLanguages(),
    verifiedOnly: getVerifiedOnly(),
  };
}

export function setMatchPrefs(
  mode: MatchMode,
  countryCode: string,
  preferSharedInterests?: boolean,
  stateCode?: string | null,
  preferSharedLanguages?: boolean,
  verifiedOnly?: boolean
) {
  setMatchMode(mode);
  setCountryCode(countryCode);
  if (mode !== "regional" || countryCode !== "US") {
    setStateCode(null);
  } else if (stateCode !== undefined) {
    setStateCode(stateCode);
  }
  if (preferSharedInterests !== undefined) {
    setPreferSharedInterests(preferSharedInterests);
  }
  if (preferSharedLanguages !== undefined) {
    setPreferSharedLanguages(preferSharedLanguages);
  }
  if (verifiedOnly !== undefined) {
    setVerifiedOnly(verifiedOnly);
  }
}

export function matchModeLabel(mode: MatchMode): string {
  return mode === "regional" ? "Regional Matchmaking" : "Worldwide Arena";
}

export function formatRegionalBadge(
  countryCode: string,
  stateCode: string | null
): string {
  const stateName = getUsStateName(stateCode);
  if (countryCode === "US" && stateName) {
    return `REGIONAL · ${stateName}`;
  }
  return `REGIONAL · ${countryCode}`;
}

export function getMatchRequestBody() {
  const prefs = getMatchPrefs();
  const stateCode =
    prefs.matchMode === "regional" &&
    prefs.countryCode === "US" &&
    prefs.stateCode
      ? prefs.stateCode
      : null;

  return {
    matchMode: prefs.matchMode,
    countryCode: prefs.countryCode,
    stateCode,
    preferSharedInterests: prefs.preferSharedInterests,
    preferSharedLanguages: prefs.preferSharedLanguages,
    verifiedOnly: prefs.verifiedOnly,
  };
}

export function expandRegionalToCountry() {
  setStateCode(null);
}
