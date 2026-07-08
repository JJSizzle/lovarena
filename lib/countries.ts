export const COUNTRIES = [
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "CZ", name: "Czech Republic" },
  { code: "EG", name: "Egypt" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "MY", name: "Malaysia" },
  { code: "MX", name: "Mexico" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "PK", name: "Pakistan" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SG", name: "Singapore" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TW", name: "Taiwan" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Turkey" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
] as const;

const COUNTRY_NAMES = new Map<string, string>(
  COUNTRIES.map((c) => [c.code, c.name])
);

export function getCountryName(code: string | null | undefined): string | null {
  if (!code) return null;
  return COUNTRY_NAMES.get(code.toUpperCase()) ?? code;
}

export function isValidCountryCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return COUNTRY_NAMES.has(code.toUpperCase());
}

export function guessCountryCode(): string {
  if (typeof navigator === "undefined") return "US";
  const lang = navigator.language;
  const parts = lang.split("-");
  if (parts.length >= 2) {
    const region = parts[1].toUpperCase();
    if (isValidCountryCode(region)) return region;
  }
  const map: Record<string, string> = {
    en: "US",
    fr: "FR",
    de: "DE",
    es: "ES",
    pt: "BR",
    ja: "JP",
    ko: "KR",
    zh: "CN",
    vi: "VN",
    id: "ID",
    th: "TH",
    ms: "MY",
    uk: "UA",
    el: "GR",
    he: "IL",
    bn: "BD",
    ur: "PK",
    ar: "EG",
    it: "IT",
    nl: "NL",
    pl: "PL",
    tr: "TR",
    ru: "RU",
    sv: "SE",
    no: "NO",
    ro: "RO",
    cs: "CZ",
  };
  return map[parts[0]] ?? "US";
}
