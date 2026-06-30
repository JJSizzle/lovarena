export type WebRtcConfig = {
  iceServers: RTCIceServer[];
  /** Route media through TURN only — hides peer IPs when true. */
  relayOnly: boolean;
};

const CONFIG_CACHE_TTL_MS = 55 * 60 * 1000;
let cachedConfig: WebRtcConfig | null = null;
let cachedAt = 0;

function iceServersIncludeTurn(servers: RTCIceServer[]): boolean {
  return servers.some((server) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    return urls.some((url) => url.startsWith("turn:") || url.startsWith("turns:"));
  });
}

export function buildPeerConnectionConfig(
  config: WebRtcConfig
): RTCConfiguration {
  return {
    iceServers: config.iceServers,
    bundlePolicy: "max-bundle",
    iceCandidatePoolSize: 0,
    ...(config.relayOnly ? { iceTransportPolicy: "relay" as const } : {}),
  };
}

/** Drop host / srflx / prflx candidates before signaling (defense in depth). */
export function sanitizeIceCandidate(
  candidate: RTCIceCandidateInit,
  relayOnly: boolean
): RTCIceCandidateInit | null {
  if (!relayOnly) return candidate;

  const line = candidate.candidate?.trim();
  if (!line) return candidate;

  const lower = line.toLowerCase();
  if (lower.includes(" typ relay ") || lower.endsWith(" typ relay")) {
    return candidate;
  }

  return null;
}

/** Remove non-relay candidates embedded in SDP. */
export function sanitizeSdp(sdp: string, relayOnly: boolean): string {
  if (!relayOnly) return sdp;

  return sdp
    .split(/\r?\n/)
    .filter((line) => {
      if (!line.startsWith("a=candidate:")) return true;
      return line.toLowerCase().includes(" typ relay ");
    })
    .join("\r\n");
}

export async function resolveWebRtcConfig(): Promise<WebRtcConfig> {
  if (cachedConfig && Date.now() - cachedAt < CONFIG_CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const res = await fetch("/api/webrtc/ice-servers", { cache: "no-store" });
    const data = (await res.json()) as {
      iceServers?: RTCIceServer[];
      turnEnabled?: boolean;
    };
    if (res.ok && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
      cachedConfig = {
        iceServers: data.iceServers,
        relayOnly: Boolean(data.turnEnabled),
      };
      cachedAt = Date.now();
      return cachedConfig;
    }
  } catch {
    // fall through
  }

  const { getStaticIceServers } = await import("@/lib/webrtc/ice-servers");
  const iceServers = getStaticIceServers();
  cachedConfig = {
    iceServers,
    relayOnly: iceServersIncludeTurn(iceServers),
  };
  cachedAt = Date.now();
  return cachedConfig;
}
