import { LANGUAGE_OPTIONS } from "@/lib/profile-tags";

/** Lovarena language label → DeepL API code (null = not supported by DeepL). */
export const DEEPL_LANG_CODES: Record<string, string | null> = {
  English: "EN",
  Spanish: "ES",
  French: "FR",
  German: "DE",
  Portuguese: "PT-BR",
  Italian: "IT",
  Dutch: "NL",
  Arabic: "AR",
  Hindi: null,
  Japanese: "JA",
  Korean: "KO",
  Chinese: "ZH-HANS",
  Russian: "RU",
  Turkish: "TR",
  Polish: "PL",
  Swedish: "SV",
  Norwegian: "NB",
  Danish: "DA",
  Filipino: null,
  Vietnamese: null,
};

export function toDeepLCode(language: string): string | null {
  return DEEPL_LANG_CODES[language] ?? null;
}

export function isSupportedTranslationLanguage(language: string): boolean {
  return toDeepLCode(language) != null;
}

export function sanitizePrimaryLanguage(value: unknown): string {
  if (typeof value !== "string") return "English";
  return (LANGUAGE_OPTIONS as readonly string[]).includes(value)
    ? value
    : "English";
}

export type TranslationResult = {
  translated: string;
  detectedSourceLanguage: string | null;
  targetLanguage: string;
};
