import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";

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

    const friendIds = (data ?? []).map((row) =>
      row.user_id === auth.profile.id ? row.friend_id : row.user_id
    );

    const connectionByFriendId = new Map(
      (data ?? []).map((row) => {
        const friendId =
          row.user_id === auth.profile.id ? row.friend_id : row.user_id;
        return [friendId, row.connection_type] as const;
      })
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, reputation_score")
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
          .select("id, username, avatar_url, reputation_score")
          .in("id", incomingIds)
      : { data: [] };

    const incomingById = new Map(
      (incomingProfiles ?? []).map((p) => [p.id, p])
    );

    return NextResponse.json({
      friends: (profiles ?? []).map((profile) => ({
        ...profile,
        connection_type: connectionByFriendId.get(profile.id) ?? null,
      })),
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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Friends fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
