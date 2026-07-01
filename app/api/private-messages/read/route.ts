import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBlockedEitherWay, requireAuthProfile } from "@/lib/auth/api-auth";
import { areFriends } from "@/lib/friends/are-friends";
import { markConversationRead } from "@/lib/dm/read-cursors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { friendId, lastReadAt } = await req.json();
    if (!friendId || friendId === auth.profile.id) {
      return NextResponse.json({ error: "Invalid friendId" }, { status: 400 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`dm-read-mark:${auth.profile.id}:${ip}`, 120, 60);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const supabase = createAdminClient();

    if (!(await areFriends(auth.profile.id, friendId, supabase))) {
      return NextResponse.json({ error: "Not friends" }, { status: 403 });
    }

    if (await isBlockedEitherWay(auth.profile.id, friendId)) {
      return NextResponse.json(
        { error: "Cannot message a blocked user." },
        { status: 403 }
      );
    }

    const at =
      typeof lastReadAt === "string" && lastReadAt
        ? lastReadAt
        : new Date().toISOString();

    const updated = await markConversationRead(
      supabase,
      auth.profile.id,
      friendId,
      at
    );

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark conversation read";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
