export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 15;

/** Username picks allowed after the initial name (signup / first real name). */
export const MAX_USERNAME_CHANGES = 2;

/** Auto-generated fallback before the user picks a real name. */
export const PLACEHOLDER_USERNAME_PATTERN = /^user_[a-f0-9]{8}$/i;

/** Letters, numbers, underscores, and periods only. Length checked separately. */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "moderator",
  "mod",
  "lovarena",
  "support",
  "official",
  "staff",
  "system",
  "root",
  "help",
  "security",
  "noreply",
  "postmaster",
  "webmaster",
] as const;

export type UsernameValidationResult = {
  valid: boolean;
  error: string | null;
};

function isReservedUsername(value: string): boolean {
  const lower = value.toLowerCase();
  const compact = lower.replace(/\./g, "");

  return RESERVED_USERNAMES.some(
    (word) => lower === word || compact === word
  );
}

export function validateUsername(raw: string): UsernameValidationResult {
  const value = raw.trim();

  if (!value) {
    return { valid: false, error: "Username is required." };
  }

  if (value.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters.`,
    };
  }

  if (value.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (/\s/.test(value)) {
    return {
      valid: false,
      error: "Username cannot contain spaces.",
    };
  }

  if (!USERNAME_PATTERN.test(value)) {
    return {
      valid: false,
      error:
        "Use only letters, numbers, underscores, and periods.",
    };
  }

  if (value.startsWith(".") || value.endsWith(".")) {
    return {
      valid: false,
      error: "Username cannot start or end with a period.",
    };
  }

  if (value.includes("..")) {
    return {
      valid: false,
      error: "Username cannot contain consecutive periods.",
    };
  }

  if (/^[_.]+$/.test(value)) {
    return {
      valid: false,
      error: "Username must include at least one letter or number.",
    };
  }

  if (isReservedUsername(value)) {
    return {
      valid: false,
      error: "That username is reserved. Please choose another.",
    };
  }

  return { valid: true, error: null };
}

export function isValidUsername(value: string): boolean {
  return validateUsername(value).valid;
}

export function isPlaceholderUsername(username: string): boolean {
  return PLACEHOLDER_USERNAME_PATTERN.test(username.trim());
}

export function usernamesEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function usernameChangesRemaining(changeCount: number): number {
  return Math.max(0, MAX_USERNAME_CHANGES - changeCount);
}

export const USERNAME_HINT =
  "3–15 characters · letters, numbers, _ and . · no spaces";
