export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

/** One-line Vercel env: WEB_PUSH_VAPID_CREDENTIALS=publicKey,privateKey */
function parseCredentialsLine(raw: string): VapidConfig | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const comma = trimmed.indexOf(",");
  if (comma <= 0 || comma >= trimmed.length - 1) return null;

  const publicKey = trimmed.slice(0, comma).trim();
  const privateKey = trimmed.slice(comma + 1).trim();
  if (!publicKey || !privateKey) return null;

  return {
    publicKey,
    privateKey,
    subject:
      process.env.WEB_PUSH_VAPID_SUBJECT ?? "mailto:support@lovarena.app",
  };
}

export function resolveVapidConfig(): VapidConfig | null {
  const combined = process.env.WEB_PUSH_VAPID_CREDENTIALS?.trim();
  if (combined) {
    const parsed = parseCredentialsLine(combined);
    if (parsed) return parsed;
  }

  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;

  return {
    publicKey,
    privateKey,
    subject:
      process.env.WEB_PUSH_VAPID_SUBJECT ?? "mailto:support@lovarena.app",
  };
}

export function isWebPushConfigured(): boolean {
  return resolveVapidConfig() !== null;
}
