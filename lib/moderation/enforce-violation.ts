import type { SupabaseClient } from "@supabase/supabase-js";
import { endActiveRoomsForUser } from "@/lib/moderation/ban-user";
import { notifyModerators } from "@/lib/moderation/notify-admin";

/**
 * Flags the sender, ends the active room, and removes them from the match queue.
 * Called when a severe blocklist violation is detected.
 */
export async function enforceSevereViolation(
  supabase: SupabaseClient,
  senderId: string,
  roomId: string
): Promise<void> {
  await supabase.from("flagged_users").upsert(
    {
      user_id: senderId,
      flagged_for_abuse: true,
      reason: "severe_hate_speech_or_slur",
      source_room_id: roomId,
      flagged_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  await endActiveRoomsForUser(supabase, senderId);

  await supabase
    .from("chat_rooms")
    .update({ status: "ended" })
    .eq("id", roomId)
    .eq("status", "active");

  void notifyModerators({
    type: "severe_violation",
    reason: "severe_hate_speech_or_slur",
    reportedUserId: senderId,
    roomId,
  });
}

export async function isUserFlaggedForAbuse(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("flagged_users")
    .select("user_id")
    .eq("user_id", userId)
    .eq("flagged_for_abuse", true)
    .maybeSingle();

  return !!data;
}
