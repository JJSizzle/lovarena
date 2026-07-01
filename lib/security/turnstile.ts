export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}

export function isTurnstileConfigured(): boolean {
  return Boolean(
    getTurnstileSiteKey() && process.env.TURNSTILE_SECRET_KEY?.trim()
  );
}

export function isSightengineConfigured(): boolean {
  return Boolean(
    process.env.SIGHTENGINE_API_USER?.trim() &&
      process.env.SIGHTENGINE_API_SECRET?.trim()
  );
}

type VerifyResult = { ok: true } | { ok: false; error: string };

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp: string
): Promise<VerifyResult> {
  if (!isTurnstileConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Captcha is not configured on this server." };
    }
    return { ok: true };
  }

  const trimmed = token?.trim();
  if (!trimmed) {
    return { ok: false, error: "Complete the captcha check." };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY!.trim();
  const body = new URLSearchParams({
    secret,
    response: trimmed,
    remoteip: remoteIp === "unknown" ? "" : remoteIp,
  });

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  if (!res.ok) {
    return { ok: false, error: "Captcha verification failed. Try again." };
  }

  const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
  if (!data.success) {
    return { ok: false, error: "Captcha expired or invalid. Try again." };
  }

  return { ok: true };
}
