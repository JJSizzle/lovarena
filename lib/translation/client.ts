import type { TranslationResult } from "@/lib/translation/language-codes";

const cache = new Map<string, TranslationResult>();

function cacheKey(text: string, targetLanguage: string): string {
  return `${targetLanguage}::${text}`;
}

export async function fetchTranslation(
  text: string,
  targetLanguage: string
): Promise<TranslationResult> {
  const key = cacheKey(text, targetLanguage);
  const hit = cache.get(key);
  if (hit) return hit;

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, targetLanguage }),
  });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error ?? "Translation failed");
  }

  const result = data as TranslationResult;
  cache.set(key, result);
  return result;
}

export function deepLLabel(code: string | null | undefined): string {
  if (!code) return "unknown";
  const normalized = code.toUpperCase().replace("_", "-");
  const map: Record<string, string> = {
    EN: "English",
    ES: "Spanish",
    FR: "French",
    DE: "German",
    PT: "Portuguese",
    "PT-BR": "Portuguese",
    IT: "Italian",
    NL: "Dutch",
    AR: "Arabic",
    JA: "Japanese",
    KO: "Korean",
    ZH: "Chinese",
    "ZH-HANS": "Chinese",
    RU: "Russian",
    TR: "Turkish",
    PL: "Polish",
    SV: "Swedish",
    NB: "Norwegian",
    DA: "Danish",
  };
  return map[normalized] ?? code;
}
