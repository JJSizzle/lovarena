import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  getPartnerId,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const VALID_REASONS = [
  "harassment",
  "hate_speech",
  "nudity",
  "spam",
  "underage",
  "other",
] as const;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const ip = clientIp(req);
    const rl = await rateLimit(`report:${auth.profile.id}:${ip}`, 10, 3600);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many reports. Try again later." },
        { status: 429 }
      );
    }

    const { roomId, reason, details } = await req.json();

    if (!roomId || !reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid report" }, { status: 400 });
    }

    const membership = await assertRoomMember(roomId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const reportedUserId = getPartnerId(membership.room, auth.profile.id);
    if (!reportedUserId) {
      return NextResponse.json({ error: "No user to report" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("abuse_reports").insert({
      reporter_id: auth.profile.id,
      reported_user_id: reportedUserId,
      room_id: roomId,
      reason,
      details: details?.trim()?.slice(0, 500) ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Report failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
