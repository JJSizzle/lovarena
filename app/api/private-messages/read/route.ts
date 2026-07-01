import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBlockedEitherWay } from "@/lib/auth/api-auth";
import { areFriends } from "@/lib/friends/are-friends";
import { markConversationRead } from "@/lib/dm/read-cursors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { friendId, lastReadAt } = await req.json();
    if (!friendId || friendId === user.id) {
      return NextResponse.json({ error: "Invalid friendId" }, { status: 400 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`dm-read-mark:${user.id}:${ip}`, 120, 60);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const supabase = createAdminClient();

    if (!(await areFriends(user.id, friendId, supabase))) {
      return NextResponse.json({ error: "Not friends" }, { status: 403 });
    }

    if (await isBlockedEitherWay(user.id, friendId)) {
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
      user.id,
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
