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
      .select("id, user_id, friend_id, status, created_at")
      .eq("status", "accepted")
      .or(`user_id.eq.${auth.profile.id},friend_id.eq.${auth.profile.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const friendIds = (data ?? []).map((row) =>
      row.user_id === auth.profile.id ? row.friend_id : row.user_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, reputation_score")
      .in("id", friendIds.length ? friendIds : ["00000000-0000-0000-0000-000000000000"]);

    return NextResponse.json({
      friends: profiles ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Friends fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
