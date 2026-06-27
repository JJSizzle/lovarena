import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import { overlapTags } from "@/lib/safety-label";
import { getSafetyLabel } from "@/lib/safety-label";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const roomId = req.nextUrl.searchParams.get("roomId");
    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const membership = await assertRoomMember(roomId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const { room } = membership;
    const partnerId =
      room.user1_id === auth.profile.id ? room.user2_id : room.user1_id;

    const supabase = createAdminClient();
    const { data: partner } = await supabase
      .from("profiles")
      .select(
        "username, interests, languages, reputation_score, created_at, age_verified, avatar_emoji"
      )
      .eq("id", partnerId)
      .maybeSingle();

    const { data: roomRow } = await supabase
      .from("chat_rooms")
      .select("match_mode")
      .eq("id", roomId)
      .maybeSingle();

    const myInterests = auth.profile.interests ?? [];
    const partnerInterests = partner?.interests ?? [];
    const safety = getSafetyLabel({
      reputation_score: partner?.reputation_score,
      created_at: partner?.created_at,
      age_verified: partner?.age_verified,
    });

    return NextResponse.json({
      partnerId,
      partnerUsername: partner?.username ?? "Stranger",
      partnerEmoji: partner?.avatar_emoji ?? "🛸",
      matchMode: roomRow?.match_mode ?? "worldwide",
      sharedTags: overlapTags(myInterests, partnerInterests),
      safetyLabel: safety.label,
      safetyTone: safety.tone,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Partner info failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
