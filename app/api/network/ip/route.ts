import { NextRequest, NextResponse } from "next/server";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

export async function GET(req: NextRequest) {
  const ip = clientIpFromRequest(req);
  const rl = await rateLimit(`network-ip:${ip}`, 30, 3600);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfterSeconds);
  }

  return NextResponse.json({ ip });
}
