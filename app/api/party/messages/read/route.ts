import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { assertPartyMember } from "@/lib/party/party-auth";
import { markPartyRead } from "@/lib/party/read-cursors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<{ partyId?: string; lastReadAt?: string }>(req);
    if (!parsed.ok) return parsed.response;
    const { partyId, lastReadAt } = parsed.data;
    if (!partyId) {
      return NextResponse.json({ error: "Missing partyId" }, { status: 400 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(
      `party-read:${auth.profile.id}:${ip}`,
      120,
      60
    );
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const membership = await assertPartyMember(partyId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const supabase = createAdminClient();
    const at =
      typeof lastReadAt === "string" && lastReadAt
        ? lastReadAt
        : new Date().toISOString();

    await markPartyRead(supabase, partyId, auth.profile.id, at);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark party chat read";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
