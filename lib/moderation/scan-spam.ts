import { normalizeForModeration } from "./normalize";

export type SpamScanResult = {
  violation: boolean;
  category?: "url" | "contact_scam" | "crypto_scam" | "repeated";
};

const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+\.(?:com|net|org|io|co|me|app|xyz|ru|tk|ml|ga|cf|gq|top|click|link|telegram|discord)\b/i;

const CONTACT_SCAM_PATTERNS = [
  /\b(?:telegram|whatsapp|snap(?:chat)?|insta(?:gram)?|onlyfans|cash\s*app|venmo|paypal)\s*(?:me|@|:)/i,
  /\b(?:add|message|dm)\s+me\s+(?:on|at)\b/i,
  /\b(?:t\.me|discord\.gg)\/\S+/i,
];

const CRYPTO_SCAM_PATTERNS = [
  /\b(?:send|transfer|deposit)\s+(?:btc|bitcoin|eth|crypto|usdt)\b/i,
  /\b(?:double|triple)\s+your\s+(?:money|crypto|btc)\b/i,
  /\b(?:free|guaranteed)\s+(?:crypto|bitcoin|nft)\b/i,
];

export function scanMessageForSpam(content: string): SpamScanResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return { violation: false };
  }

  const { compact } = normalizeForModeration(trimmed);

  if (URL_PATTERN.test(trimmed) || URL_PATTERN.test(compact)) {
    return { violation: true, category: "url" };
  }

  for (const pattern of CONTACT_SCAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { violation: true, category: "contact_scam" };
    }
  }

  for (const pattern of CRYPTO_SCAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { violation: true, category: "crypto_scam" };
    }
  }

  if (/(.)\1{7,}/.test(compact)) {
    return { violation: true, category: "repeated" };
  }

  return { violation: false };
}
