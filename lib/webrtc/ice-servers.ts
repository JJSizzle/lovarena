export const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function parseTurnUrls(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

/** True when static TURN env vars are set (legacy manual setup). */
export function hasStaticTurnConfigured(): boolean {
  const urls = parseTurnUrls(process.env.NEXT_PUBLIC_TURN_URL);
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME?.trim();
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL?.trim();
  return urls.length > 0 && Boolean(username && credential);
}

/** True when Metered one-line or two-line env is set on the server. */
export function hasMeteredTurnConfigured(): boolean {
  if (process.env.METERED_TURN_CREDENTIALS_URL?.trim()) return true;
  return Boolean(
    process.env.METERED_TURN_API_KEY?.trim() && process.env.METERED_TURN_APP?.trim()
  );
}

/** @deprecated Use hasStaticTurnConfigured or resolveIceServers instead. */
export function hasTurnConfigured(): boolean {
  return hasStaticTurnConfigured() || hasMeteredTurnConfigured();
}

/** Static ICE servers from env — used as fallback when the API route is unavailable. */
export function getStaticIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [...STUN_SERVERS];

  const turnUrls = parseTurnUrls(process.env.NEXT_PUBLIC_TURN_URL);
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME?.trim();
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL?.trim();

  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}

/** @deprecated Use resolveIceServers for arena + party WebRTC. */
export function getIceServers(): RTCIceServer[] {
  return getStaticIceServers();
}

const ICE_CACHE_TTL_MS = 55 * 60 * 1000;
let cachedIceServers: RTCIceServer[] | null = null;
let cachedAt = 0;

/** Fetches TURN credentials from the server (Metered or static fallback). */
export async function resolveIceServers(): Promise<RTCIceServer[]> {
  if (cachedIceServers && Date.now() - cachedAt < ICE_CACHE_TTL_MS) {
    return cachedIceServers;
  }

  try {
    const res = await fetch("/api/webrtc/ice-servers", { cache: "no-store" });
    const data = (await res.json()) as { iceServers?: RTCIceServer[] };
    if (res.ok && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
      cachedIceServers = data.iceServers;
      cachedAt = Date.now();
      return cachedIceServers;
    }
  } catch {
    // fall through
  }

  cachedIceServers = getStaticIceServers();
  cachedAt = Date.now();
  return cachedIceServers;
}
