import { createAdminClient } from "@/lib/supabase/admin";

/** How long without a partner heartbeat before treating them as gone. */
export const PARTNER_PRESENCE_STALE_MS = 18_000;

/** Grace period after match before ghost detection runs. */
export const ROOM_GHOST_GRACE_MS = 15_000;

export async function endRoomIfPartnerGone(
  roomId: string,
  roomCreatedAt: string,
  partnerId: string
): Promise<boolean> {
  if (Date.now() - new Date(roomCreatedAt).getTime() < ROOM_GHOST_GRACE_MS) {
    return false;
  }

  const supabase = createAdminClient();
  const { data: presence } = await supabase
    .from("user_presence")
    .select("last_seen_at, in_chat")
    .eq("user_id", partnerId)
    .maybeSingle();

  if (!presence?.in_chat || !presence.last_seen_at) return false;

  const elapsed = Date.now() - new Date(presence.last_seen_at).getTime();
  if (elapsed <= PARTNER_PRESENCE_STALE_MS) return false;

  await supabase.rpc("leave_chat", {
    p_user_id: partnerId,
    p_room_id: roomId,
  });

  return true;
}
