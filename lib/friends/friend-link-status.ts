import type { SupabaseClient } from "@supabase/supabase-js";
import type { FriendConnectionType } from "@/lib/friends/connection-type";

export type FriendLinkStatus =
  | "none"
  | "friends"
  | "pending_sent"
  | "pending_received";

export function friendLinkStatus(
  userId: string,
  partnerId: string,
  rows: Array<{ user_id: string; friend_id: string; status: string }>
): FriendLinkStatus {
  const relevant = rows.filter(
    (row) =>
      (row.user_id === userId && row.friend_id === partnerId) ||
      (row.user_id === partnerId && row.friend_id === userId)
  );

  if (
    relevant.some(
      (row) =>
        row.status === "accepted" &&
        ((row.user_id === userId && row.friend_id === partnerId) ||
          (row.user_id === partnerId && row.friend_id === userId))
    )
  ) {
    return "friends";
  }

  if (
    relevant.some(
      (row) =>
        row.status === "pending" &&
        row.user_id === userId &&
        row.friend_id === partnerId
    )
  ) {
    return "pending_sent";
  }

  if (
    relevant.some(
      (row) =>
        row.status === "pending" &&
        row.user_id === partnerId &&
        row.friend_id === userId
    )
  ) {
    return "pending_received";
  }

  return "none";
}

export async function acceptFriendshipPair(
  supabase: SupabaseClient,
  userId: string,
  partnerId: string,
  connectionType: FriendConnectionType = "request"
): Promise<void> {
  await supabase
    .from("friendships")
    .update({ status: "accepted", connection_type: connectionType })
    .eq("user_id", partnerId)
    .eq("friend_id", userId)
    .eq("status", "pending");

  await supabase.from("friendships").upsert(
    [
      {
        user_id: userId,
        friend_id: partnerId,
        status: "accepted",
        connection_type: connectionType,
      },
      {
        user_id: partnerId,
        friend_id: userId,
        status: "accepted",
        connection_type: connectionType,
      },
    ],
    { onConflict: "user_id,friend_id" }
  );
}
