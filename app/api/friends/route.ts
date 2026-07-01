import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { partnerIdsFromFriendshipRows } from "@/lib/friends/are-friends";
import { removeFriendshipPair } from "@/lib/friends/friend-link-status";
import { MAX_FRIENDS } from "@/lib/friends/limits";

export async function GET() {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id, status, connection_type, created_at")
      .eq("status", "accepted")
      .or(`user_id.eq.${auth.profile.id},friend_id.eq.${auth.profile.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const friendIds = partnerIdsFromFriendshipRows(auth.profile.id, data ?? []);

    const connectionByFriendId = new Map(
      (data ?? []).map((row) => {
        const friendId =
          row.user_id === auth.profile.id ? row.friend_id : row.user_id;
        return [friendId, row.connection_type] as const;
      })
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, avatar_emoji, reputation_score")
      .in("id", friendIds.length ? friendIds : ["00000000-0000-0000-0000-000000000000"]);

    const { data: pendingIncoming } = await supabase
      .from("friendships")
      .select("user_id, created_at")
      .eq("friend_id", auth.profile.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const incomingIds = (pendingIncoming ?? []).map((row) => row.user_id);
    const { data: incomingProfiles } = incomingIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_url, avatar_emoji, reputation_score")
          .in("id", incomingIds)
      : { data: [] };

    const incomingById = new Map(
      (incomingProfiles ?? []).map((p) => [p.id, p])
    );

    const { data: pendingOutgoing } = await supabase
      .from("friendships")
      .select("friend_id, created_at")
      .eq("user_id", auth.profile.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const outgoingIds = (pendingOutgoing ?? []).map((row) => row.friend_id);
    const { data: outgoingProfiles } = outgoingIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_url, avatar_emoji, reputation_score")
          .in("id", outgoingIds)
      : { data: [] };

    const outgoingById = new Map(
      (outgoingProfiles ?? []).map((p) => [p.id, p])
    );

    return NextResponse.json({
      friends: (profiles ?? []).map((profile) => ({
        ...profile,
        connection_type: connectionByFriendId.get(profile.id) ?? null,
      })),
      friendCount: friendIds.length,
      friendLimit: MAX_FRIENDS,
      incomingRequests: (pendingIncoming ?? [])
        .map((row) => {
          const profile = incomingById.get(row.user_id);
          if (!profile) return null;
          return {
            ...profile,
            requested_at: row.created_at,
          };
        })
        .filter(Boolean),
      outgoingRequests: (pendingOutgoing ?? [])
        .map((row) => {
          const profile = outgoingById.get(row.friend_id);
          if (!profile) return null;
          return {
            ...profile,
            requested_at: row.created_at,
          };
        })
        .filter(Boolean),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Friends fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { friendId } = await req.json();
    if (!friendId || friendId === auth.profile.id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: rows } = await supabase
      .from("friendships")
      .select("id")
      .or(
        `and(user_id.eq.${auth.profile.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${auth.profile.id})`
      );

    if (!rows?.length) {
      return NextResponse.json(
        { error: "Not friends with this user." },
        { status: 404 }
      );
    }

    await removeFriendshipPair(supabase, auth.profile.id, friendId);

    return NextResponse.json({
      ok: true,
      message: "Removed from your list.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Remove failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
