import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import {
  friendLinkStatus,
  type FriendLinkStatus,
} from "@/lib/friends/friend-link-status";
import { buildFriendProfileView } from "@/lib/friends/friend-profile-view";
import type { FriendConnectionType } from "@/lib/friends/connection-type";

type RouteParams = { params: Promise<{ friendId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { friendId } = await params;
    if (!friendId || friendId === auth.profile.id) {
      return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: friendRows } = await supabase
      .from("friendships")
      .select("user_id, friend_id, status, connection_type")
      .or(
        `and(user_id.eq.${auth.profile.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${auth.profile.id})`
      );

    const linkStatus: FriendLinkStatus = friendLinkStatus(
      auth.profile.id,
      friendId,
      friendRows ?? []
    );

    if (linkStatus !== "friends") {
      return NextResponse.json(
        { error: "You can only view profiles of your friends." },
        { status: 403 }
      );
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, username, age, show_age, age_verified, id_verified, gender_identity, bio, interests, languages, avatar_url, avatar_emoji, reputation_score, chat_streak, positive_ratings, country_code, state_code, created_at"
      )
      .eq("id", friendId)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const acceptedRow = (friendRows ?? []).find(
      (row) => row.status === "accepted"
    );
    const connectionType = (acceptedRow?.connection_type ??
      null) as FriendConnectionType | null;

    return NextResponse.json({
      profile: buildFriendProfileView(profile, {
        connectionType,
        viewerInterests: auth.profile.interests ?? [],
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Profile load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
