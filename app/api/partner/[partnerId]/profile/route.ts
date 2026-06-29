import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { buildFriendProfileView } from "@/lib/friends/friend-profile-view";
import { resolvePartnerProfileAccess } from "@/lib/friends/partner-profile-access";

type RouteParams = { params: Promise<{ partnerId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { partnerId } = await params;
    if (!partnerId || partnerId === auth.profile.id) {
      return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
    }

    const roomId = req.nextUrl.searchParams.get("roomId");
    const supabase = createAdminClient();

    const access = await resolvePartnerProfileAccess(
      supabase,
      auth.profile.id,
      partnerId,
      roomId
    );

    if (!access.allowed) {
      return NextResponse.json(
        { error: "You can only view profiles of friends or recent matches." },
        { status: 403 }
      );
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, username, age, show_age, age_verified, gender_identity, bio, interests, languages, avatar_url, avatar_emoji, reputation_score, chat_streak, positive_ratings, country_code, state_code, created_at"
      )
      .eq("id", partnerId)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      profile: buildFriendProfileView(profile, {
        connectionType: access.connectionType,
        viewerInterests: auth.profile.interests ?? [],
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Profile load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
