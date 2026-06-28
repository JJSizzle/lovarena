import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyModerators } from "@/lib/moderation/notify-admin";
import { applyTimedRestriction } from "@/lib/moderation/user-restriction";

export {
  getUserRestriction,
  getRestrictionApiPayload,
  isUserFlaggedForAbuse,
} from "@/lib/moderation/user-restriction";

/**
 * Flags the sender with a 24h restriction, ends the active room, and removes
 * them from the match queue. Called when a severe blocklist violation is detected.
 */
export async function enforceSevereViolation(
  supabase: SupabaseClient,
  senderId: string,
  roomId: string
): Promise<void> {
  const result = await applyTimedRestriction(
    supabase,
    senderId,
    "severe_hate_speech_or_slur",
    roomId
  );

  await supabase
    .from("chat_rooms")
    .update({ status: "ended" })
    .eq("id", roomId)
    .eq("status", "active");

  void notifyModerators({
    type: "severe_violation",
    reason:
      result.type === "ban"
        ? "severe_hate_speech_or_slur (second strike → ban)"
        : "severe_hate_speech_or_slur (24h restrict)",
    reportedUserId: senderId,
    roomId,
  });
}
