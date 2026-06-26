import {
  buildObfuscatedPattern,
  normalizeForModeration,
} from "./normalize";
import { SEVERE_BLOCKLIST_ROOTS } from "./severe-blocklist";

export type SevereViolationResult = {
  violation: boolean;
  /** Internal label for logging — not shown to users */
  category?: "severe_blocklist";
};

const PATTERNS = SEVERE_BLOCKLIST_ROOTS.map((root) =>
  buildObfuscatedPattern(root)
);

/**
 * Scans message content for high-severity hate speech / slurs.
 * Runs server-side only before any message is persisted.
 */
export function scanMessageForSevereViolation(
  content: string
): SevereViolationResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return { violation: false };
  }

  const { compact, tokens } = normalizeForModeration(trimmed);
  const haystacks = [trimmed, compact, tokens.join(" ")];

  for (const pattern of PATTERNS) {
    for (const haystack of haystacks) {
      if (pattern.test(haystack)) {
        return { violation: true, category: "severe_blocklist" };
      }
    }
  }

  // Token-exact match on compact roots (catches split evasion in token stream)
  for (const root of SEVERE_BLOCKLIST_ROOTS) {
    const compactRoot = root.replace(/[^a-z0-9]/g, "");
    if (compactRoot.length >= 4 && compact.includes(compactRoot)) {
      return { violation: true, category: "severe_blocklist" };
    }
    for (const token of tokens) {
      const compactToken = token.replace(/[^a-z0-9]/g, "");
      if (compactToken === compactRoot || compactToken.includes(compactRoot)) {
        return { violation: true, category: "severe_blocklist" };
      }
    }
  }

  return { violation: false };
}
