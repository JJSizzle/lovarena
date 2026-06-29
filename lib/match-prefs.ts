export type MatchMode = "regional" | "worldwide";

const MODE_KEY = "lovarena_match_mode";
const COUNTRY_KEY = "lovarena_country_code";
const PREFER_INTERESTS_KEY = "lovarena_prefer_shared_interests";

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

export function getPreferSharedInterests(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PREFER_INTERESTS_KEY) === "true";
}

export function setPreferSharedInterests(enabled: boolean) {
  sessionStorage.setItem(PREFER_INTERESTS_KEY, enabled ? "true" : "false");
}

export function getMatchPrefs() {
  return {
    matchMode: getMatchMode(),
    countryCode: getCountryCode(),
    preferSharedInterests: getPreferSharedInterests(),
  };
}

export function setMatchPrefs(
  mode: MatchMode,
  countryCode: string,
  preferSharedInterests?: boolean
) {
  setMatchMode(mode);
  setCountryCode(countryCode);
  if (preferSharedInterests !== undefined) {
    setPreferSharedInterests(preferSharedInterests);
  }
}

export function matchModeLabel(mode: MatchMode): string {
  return mode === "regional" ? "Regional Matchmaking" : "Worldwide Arena";
}

export function getMatchRequestBody() {
  const prefs = getMatchPrefs();
  return {
    matchMode: prefs.matchMode,
    countryCode: prefs.countryCode,
    preferSharedInterests: prefs.preferSharedInterests,
  };
}
