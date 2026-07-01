import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function areFriends(
  userA: string,
  userB: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  if (userA === userB) return true;
  const client = supabase ?? createAdminClient();
  const { data } = await client
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(user_id.eq.${userA},friend_id.eq.${userB}),and(user_id.eq.${userB},friend_id.eq.${userA})`
    )
    .limit(1);

  return Boolean(data?.length);
}

export async function countAcceptedFriends(
  profileId: string,
  supabase?: SupabaseClient
): Promise<number> {
  const client = supabase ?? createAdminClient();
  const { count, error } = await client
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(`user_id.eq.${profileId},friend_id.eq.${profileId}`);

  if (error) return 0;
  return count ?? 0;
}
