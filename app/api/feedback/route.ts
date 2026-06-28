import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  getPartnerId,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { REP_THUMBS_DOWN, subtractReputation } from "@/lib/reputation";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const ip = clientIp(req);
    const rl = await rateLimit(`feedback:${auth.profile.id}:${ip}`, 20, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const { roomId, partnerId, rating } = await req.json();
    if (!roomId || !partnerId || (rating !== "up" && rating !== "down")) {
      return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
    }

    const membership = await assertRoomMember(roomId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const expectedPartner = getPartnerId(membership.room, auth.profile.id);
    if (!expectedPartner || expectedPartner !== partnerId) {
      return NextResponse.json({ error: "Invalid partner for this room" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("chat_feedback").upsert({
      room_id: roomId,
      rater_id: auth.profile.id,
      partner_id: partnerId,
      rating,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (rating === "up") {
      await supabase.rpc("apply_positive_rating", { p_partner_id: partnerId });
    } else {
      const { data: partnerRow } = await supabase
        .from("profiles")
        .select("reputation_score")
        .eq("id", partnerId)
        .maybeSingle();
      await supabase
        .from("profiles")
        .update({
          reputation_score: subtractReputation(
            partnerRow?.reputation_score ?? 100,
            REP_THUMBS_DOWN
          ),
        })
        .eq("id", partnerId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Feedback failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
