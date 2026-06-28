export const MIN_AGE = 18;
export const MAX_AGE = 120;

export function isValidAge(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_AGE &&
    value <= MAX_AGE
  );
}

export function parseAgeInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return isValidAge(n) ? n : null;
}

export function formatProfileAge(
  age: number | null | undefined,
  showAge = true
): string | null {
  if (!showAge || age == null) return null;
  return `${age}`;
}

export function formatPartnerLine(
  username: string,
  age: number | null | undefined,
  showAge = true
): string {
  const ageStr = formatProfileAge(age, showAge);
  return ageStr ? `${username}, ${ageStr}` : username;
}
