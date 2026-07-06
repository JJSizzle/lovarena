import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import { friendLinkStatus } from "@/lib/friends/friend-link-status";
import { overlapTags, getSafetyLabel } from "@/lib/safety-label";
import { genderLabel, type GenderIdentity } from "@/lib/profile-orientation";
import {
  allowsFriendRequests,
  allowsMutualSpark,
} from "@/lib/social-privacy";
import { formatProfileLocation } from "@/lib/profile-location";

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
        "username, age, show_age, gender_identity, interests, languages, reputation_score, created_at, age_verified, id_verified, avatar_url, avatar_emoji, bio, allow_friend_requests, allow_mutual_spark, country_code, state_code"
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
      id_verified: partner?.id_verified,
    });

    const showAge = partner?.show_age !== false;
    const partnerAge =
      showAge && typeof partner?.age === "number" ? partner.age : null;

    const { data: friendRows } = await supabase
      .from("friendships")
      .select("user_id, friend_id, status, connection_type")
      .or(
        `and(user_id.eq.${auth.profile.id},friend_id.eq.${partnerId}),and(user_id.eq.${partnerId},friend_id.eq.${auth.profile.id})`
      );

    const acceptedRow = (friendRows ?? []).find((row) => row.status === "accepted");

    return NextResponse.json({
      partnerId,
      partnerUsername: partner?.username ?? "Stranger",
      partnerAge,
      partnerGender: partner?.gender_identity
        ? genderLabel(partner.gender_identity as GenderIdentity)
        : null,
      partnerLocation: formatProfileLocation(
        partner?.country_code,
        partner?.state_code
      ),
      partnerBio: partner?.bio ? String(partner.bio).slice(0, 120) : null,
      partnerAvatarUrl: partner?.avatar_url ?? null,
      partnerEmoji: partner?.avatar_emoji ?? "🛸",
      matchMode: roomRow?.match_mode ?? "worldwide",
      sharedTags: overlapTags(myInterests, partnerInterests),
      partnerInterests: (partnerInterests as string[]).slice(0, 4),
      safetyLabel: safety.label,
      safetyTone: safety.tone,
      friendStatus: friendLinkStatus(
        auth.profile.id,
        partnerId,
        friendRows ?? []
      ),
      connectionType: acceptedRow?.connection_type ?? null,
      partnerAllowsFriendRequests: allowsFriendRequests(
        partner?.allow_friend_requests
      ),
      partnerAllowsMutualSpark: allowsMutualSpark(partner?.allow_mutual_spark),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Partner info failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
