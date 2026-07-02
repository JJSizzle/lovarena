import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  getPartnerId,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { applyFeedbackReputationChange } from "@/lib/feedback/apply-feedback-reputation";
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const ip = clientIp(req);
    const rl = await rateLimit(`feedback:${auth.profile.id}:${ip}`, 20, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const parsed = await parseJsonBody<{
      roomId?: string;
      partnerId?: string;
      rating?: string;
    }>(req);
    if (!parsed.ok) return parsed.response;
    const { roomId, partnerId, rating } = parsed.data;
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

    const { data: existingFeedback } = await supabase
      .from("chat_feedback")
      .select("rating")
      .eq("room_id", roomId)
      .eq("rater_id", auth.profile.id)
      .maybeSingle();

    const ratingChanged =
      !existingFeedback || existingFeedback.rating !== rating;

    const { error } = await supabase.from("chat_feedback").upsert({
      room_id: roomId,
      rater_id: auth.profile.id,
      partner_id: partnerId,
      rating,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (ratingChanged) {
      await applyFeedbackReputationChange(
        supabase,
        partnerId,
        existingFeedback?.rating ?? null,
        rating
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Feedback failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
