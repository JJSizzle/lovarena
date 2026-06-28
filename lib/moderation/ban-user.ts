import type { SupabaseClient } from "@supabase/supabase-js";

/** End every active room the user is in and remove them from the match queue. */
export async function endActiveRoomsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase
    .from("chat_rooms")
    .update({ status: "ended" })
    .eq("status", "active")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  await supabase.from("waiting_users").delete().eq("user_id", userId);
}

/** Flag user and end all active sessions (admin ban / auto-flag). */
export async function banUserFromPlatform(
  supabase: SupabaseClient,
  userId: string,
  reason: string,
  sourceRoomId?: string | null
): Promise<void> {
  await supabase.from("flagged_users").upsert(
    {
      user_id: userId,
      flagged_for_abuse: true,
      reason,
      source_room_id: sourceRoomId ?? null,
      flagged_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  await endActiveRoomsForUser(supabase, userId);

  await supabase
    .from("profiles")
    .update({
      reputation_score: 0,
    })
    .eq("id", userId);
}
