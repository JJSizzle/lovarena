import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { roomId, partnerId, rating } = await req.json();
    if (!roomId || !partnerId || (rating !== "up" && rating !== "down")) {
      return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
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
          reputation_score: Math.max(
            0,
            (partnerRow?.reputation_score ?? 100) - 3
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
