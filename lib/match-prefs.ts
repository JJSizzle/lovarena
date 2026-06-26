export type MatchMode = "regional" | "worldwide";

const MODE_KEY = "lovarena_match_mode";
const COUNTRY_KEY = "lovarena_country_code";

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

export function getMatchPrefs() {
  return {
    matchMode: getMatchMode(),
    countryCode: getCountryCode(),
  };
}

export function setMatchPrefs(mode: MatchMode, countryCode: string) {
  setMatchMode(mode);
  setCountryCode(countryCode);
}

export function matchModeLabel(mode: MatchMode): string {
  return mode === "regional" ? "Regional Matchmaking" : "Worldwide Arena";
}
