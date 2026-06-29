import type { SupabaseClient } from "@supabase/supabase-js";
import { assertRoomMember } from "@/lib/auth/api-auth";
import type { FriendConnectionType } from "@/lib/friends/connection-type";
import { friendLinkStatus } from "@/lib/friends/friend-link-status";
import { verifyRecentMatch } from "@/lib/moderation/report-reputation";

export async function resolvePartnerProfileAccess(
  supabase: SupabaseClient,
  viewerId: string,
  partnerId: string,
  roomId?: string | null
): Promise<{ allowed: boolean; connectionType: FriendConnectionType | null }> {
  const { data: friendRows } = await supabase
    .from("friendships")
    .select("user_id, friend_id, status, connection_type")
    .or(
      `and(user_id.eq.${viewerId},friend_id.eq.${partnerId}),and(user_id.eq.${partnerId},friend_id.eq.${viewerId})`
    );

  const linkStatus = friendLinkStatus(viewerId, partnerId, friendRows ?? []);

  if (linkStatus === "friends") {
    const acceptedRow = (friendRows ?? []).find((row) => row.status === "accepted");
    return {
      allowed: true,
      connectionType: (acceptedRow?.connection_type ??
        null) as FriendConnectionType | null,
    };
  }

  if (roomId) {
    const membership = await assertRoomMember(roomId, viewerId);
    if (!("error" in membership)) {
      const roomPartnerId =
        membership.room.user1_id === viewerId
          ? membership.room.user2_id
          : membership.room.user1_id;
      if (roomPartnerId === partnerId) {
        return { allowed: true, connectionType: null };
      }
    }
  }

  const matched = await verifyRecentMatch(supabase, viewerId, partnerId);
  if (matched) {
    return { allowed: true, connectionType: null };
  }

  return { allowed: false, connectionType: null };
}
