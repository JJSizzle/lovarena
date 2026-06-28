import type { SupabaseClient } from "@supabase/supabase-js";
import { logModerationStrike } from "@/lib/moderation/user-restriction";

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

/** Permanent ban — flagged until admin removes it. */
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
      is_permanent_ban: true,
      restricted_until: null,
      review_status: "banned",
      auto_reviewed_at: new Date().toISOString(),
      reason: reason.slice(0, 200),
      source_room_id: sourceRoomId ?? null,
      flagged_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  await logModerationStrike(supabase, userId, "ban", reason);
  await endActiveRoomsForUser(supabase, userId);

  await supabase
    .from("profiles")
    .update({
      reputation_score: 0,
    })
    .eq("id", userId);
}

/** Admin override — clear an active restriction. */
export async function unflagUser(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { liftRestriction } = await import("@/lib/moderation/user-restriction");
  await liftRestriction(supabase, userId, "dismissed", "admin_unflag");
}
