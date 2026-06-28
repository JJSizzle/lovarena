import {
  sanitizePrimaryLanguage,
  toDeepLCode,
  type TranslationResult,
} from "@/lib/translation/language-codes";

export type { TranslationResult };

export async function translateText(
  text: string,
  targetLanguage: string
): Promise<TranslationResult> {
  const authKey = process.env.DEEPL_AUTH_KEY;
  if (!authKey) {
    throw new Error("Translation is not configured on this server.");
  }

  const targetCode = toDeepLCode(targetLanguage);
  if (!targetCode) {
    throw new Error(`Translation to ${targetLanguage} is not supported yet.`);
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Nothing to translate.");
  }
  if (trimmed.length > 500) {
    throw new Error("Message is too long to translate.");
  }

  const baseUrl = authKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  const body = new URLSearchParams();
  body.set("text", trimmed);
  body.set("target_lang", targetCode);

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${authKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      errText ? `Translation failed (${res.status})` : "Translation failed."
    );
  }

  const data = (await res.json()) as {
    translations?: Array<{
      text: string;
      detected_source_language?: string;
    }>;
  };

  const row = data.translations?.[0];
  if (!row?.text) {
    throw new Error("Translation returned empty.");
  }

  return {
    translated: row.text,
    detectedSourceLanguage: row.detected_source_language ?? null,
    targetLanguage: sanitizePrimaryLanguage(targetLanguage),
  };
}
