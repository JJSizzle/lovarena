const STUN_SERVERS: RTCIceServer[] = [
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

/** True when TURN credentials are set in env (arena + party WebRTC). */
export function hasTurnConfigured(): boolean {
  const urls = parseTurnUrls(process.env.NEXT_PUBLIC_TURN_URL);
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME?.trim();
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL?.trim();
  return urls.length > 0 && Boolean(username && credential);
}

export function getIceServers(): RTCIceServer[] {
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
