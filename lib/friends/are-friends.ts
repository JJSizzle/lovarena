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

export function partnerIdsFromFriendshipRows(
  profileId: string,
  rows: Array<{ user_id: string; friend_id: string }>
): string[] {
  const partnerIds = new Set<string>();
  for (const row of rows) {
    if (row.user_id === profileId) partnerIds.add(row.friend_id);
    else if (row.friend_id === profileId) partnerIds.add(row.user_id);
  }
  return [...partnerIds];
}

export async function getAcceptedFriendIds(
  profileId: string,
  supabase?: SupabaseClient
): Promise<string[]> {
  const client = supabase ?? createAdminClient();
  const { data, error } = await client
    .from("friendships")
    .select("user_id, friend_id")
    .eq("status", "accepted")
    .or(`user_id.eq.${profileId},friend_id.eq.${profileId}`);

  if (error) return [];
  return partnerIdsFromFriendshipRows(profileId, data ?? []);
}

export async function countAcceptedFriends(
  profileId: string,
  supabase?: SupabaseClient
): Promise<number> {
  const friendIds = await getAcceptedFriendIds(profileId, supabase);
  return friendIds.length;
}
