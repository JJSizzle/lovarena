import { NextResponse } from "next/server";
import { getStaticIceServers, STUN_SERVERS } from "@/lib/webrtc/ice-servers";

export const dynamic = "force-dynamic";

function meteredCredentialsUrl(): string | null {
  const direct = process.env.METERED_TURN_CREDENTIALS_URL?.trim();
  if (direct) return direct;

  const apiKey = process.env.METERED_TURN_API_KEY?.trim();
  const app = process.env.METERED_TURN_APP?.trim();
  if (!apiKey || !app) return null;

  const host = app.includes(".") ? app : `${app}.metered.live`;
  return `https://${host}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;
}

function mergeIceServers(turnServers: RTCIceServer[]): RTCIceServer[] {
  const merged: RTCIceServer[] = [...STUN_SERVERS];
  const seen = new Set<string>();

  for (const server of STUN_SERVERS) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    urls.forEach((url) => seen.add(url));
  }

  for (const server of turnServers) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    const key = urls.join("|") + (server.username ?? "");
    if (seen.has(key)) continue;
    urls.forEach((url) => seen.add(url));
    merged.push(server);
  }

  return merged;
}

async function fetchMeteredIceServers(): Promise<RTCIceServer[] | null> {
  const url = meteredCredentialsUrl();
  if (!url) return null;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const data = (await res.json()) as RTCIceServer[] | { iceServers?: RTCIceServer[] };
    const servers = Array.isArray(data) ? data : data.iceServers;
    if (!Array.isArray(servers) || servers.length === 0) return null;
    return mergeIceServers(servers);
  } catch {
    return null;
  }
}

export async function GET() {
  const metered = await fetchMeteredIceServers();
  const iceServers = metered ?? getStaticIceServers();
  const turnEnabled =
    metered != null ||
    iceServers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return urls.some((url) => url.startsWith("turn:") || url.startsWith("turns:"));
    });

  return NextResponse.json(
    { iceServers, turnEnabled },
    {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    }
  );
}
