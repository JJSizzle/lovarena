/**
 * High-severity blocklist — server-only. Maintain terms here; never expose to clients.
 * Includes base forms used to generate obfuscation-tolerant patterns.
 */
export const SEVERE_BLOCKLIST_ROOTS: readonly string[] = [
  // Racial / ethnic slurs and common variants
  "nigger",
  "n1gger",
  "negro",
  "coon",
  "spic",
  "wetback",
  "chink",
  "gook",
  "kike",
  // Anti-LGBT slurs
  "faggot",
  "fagot",
  "fagg",
  "dyke",
  "tranny",
  // Extreme sexual violence / dehumanization
  "childporn",
  "cporn",
  "hitler",
  "heilhitler",
  "killall",
  "gaschamber",
  "whitepower",
  "sigheil",
  // Severe misogynistic slurs
  "cunt",
  "rapebaby",
];
