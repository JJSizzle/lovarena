export const INTEREST_OPTIONS = [
  "Gaming",
  "Music",
  "Movies",
  "Sports",
  "Travel",
  "Fitness",
  "Art",
  "Tech",
  "Food",
  "Books",
  "Fashion",
  "Photography",
  "Anime",
  "Comedy",
  "Dancing",
  "Pets",
  "Nature",
  "Politics",
  "Science",
  "Languages",
] as const;

export const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Dutch",
  "Arabic",
  "Hindi",
  "Japanese",
  "Korean",
  "Chinese",
  "Russian",
  "Turkish",
  "Polish",
  "Swedish",
  "Norwegian",
  "Danish",
  "Filipino",
  "Vietnamese",
] as const;

export type Interest = (typeof INTEREST_OPTIONS)[number];
export type Language = (typeof LANGUAGE_OPTIONS)[number];

const INTEREST_SET = new Set<string>(INTEREST_OPTIONS);
const LANGUAGE_SET = new Set<string>(LANGUAGE_OPTIONS);

export function sanitizeTags(
  values: unknown,
  allowed: ReadonlySet<string>,
  max = 8
): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !allowed.has(value)) continue;
    if (out.includes(value)) continue;
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

export function sanitizeInterests(values: unknown): string[] {
  return sanitizeTags(values, INTEREST_SET, 8);
}

export function sanitizeLanguages(values: unknown): string[] {
  return sanitizeTags(values, LANGUAGE_SET, 5);
}

export const MATCH_WAIT_TIPS = [
  "Tip: Add interests on your profile for better matches.",
  "Tip: Use Ice Breaker when the conversation stalls.",
  "Tip: Press Next anytime to find someone new.",
  "Tip: ❤️ Connect if you want to stay friends after the chat.",
  "Tip: Report or block anyone who breaks the rules.",
  "Tip: Regional mode matches people in your country.",
];
