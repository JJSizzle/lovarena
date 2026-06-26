/**
 * Normalizes text to catch common evasion (leet speak, spacing, punctuation).
 * Server-only — used by the abuse filter.
 */
export function normalizeForModeration(text: string): {
  compact: string;
  tokens: string[];
} {
  let s = text.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");

  const leetMap: Record<string, string> = {
    "0": "o",
    "1": "i",
    "2": "z",
    "3": "e",
    "4": "a",
    "5": "s",
    "6": "g",
    "7": "t",
    "8": "b",
    "9": "g",
    "@": "a",
    "$": "s",
    "!": "i",
    "+": "t",
  };

  s = s
    .split("")
    .map((char) => leetMap[char] ?? char)
    .join("");

  // Collapse stretched letters: "fuuuuuck" -> "fuuck" -> further collapse duplicates
  s = s.replace(/(.)\1{2,}/g, "$1$1");

  const compact = s.replace(/[^a-z0-9]/g, "");
  const tokens = s
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return { compact, tokens };
}

/**
 * Builds a regex that matches a term with optional non-letter separators between chars.
 */
export function buildObfuscatedPattern(term: string): RegExp {
  const escaped = term
    .split("")
    .map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^a-z0-9]*");
  return new RegExp(escaped, "i");
}
