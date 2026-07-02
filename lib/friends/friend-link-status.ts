import type { SupabaseClient } from "@supabase/supabase-js";
import type { FriendConnectionType } from "@/lib/friends/connection-type";
import {
  assertFriendCapacityForPair,
  friendLimitMessage,
  MAX_FRIENDS,
} from "@/lib/friends/limits";
import { countAcceptedFriends } from "@/lib/friends/are-friends";

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

async function acceptFriendshipPairLegacy(
  supabase: SupabaseClient,
  userId: string,
  partnerId: string,
  connectionType: FriendConnectionType
): Promise<void> {
  const capacity = await assertFriendCapacityForPair(
    supabase,
    userId,
    partnerId
  );
  if (!capacity.ok) {
    throw new Error(capacity.error);
  }

  await supabase
    .from("friendships")
    .update({ status: "accepted", connection_type: connectionType })
    .eq("user_id", partnerId)
    .eq("friend_id", userId)
    .eq("status", "pending");

  const { error: upsertError } = await supabase.from("friendships").upsert(
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

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const [userCount, partnerCount] = await Promise.all([
    countAcceptedFriends(userId, supabase),
    countAcceptedFriends(partnerId, supabase),
  ]);

  if (userCount > MAX_FRIENDS || partnerCount > MAX_FRIENDS) {
    await removeFriendshipPair(supabase, userId, partnerId);
    const over =
      userCount > MAX_FRIENDS
        ? friendLimitMessage(userCount)
        : friendLimitMessage(partnerCount);
    throw new Error(over);
  }
}

function rpcAcceptError(status: string): string {
  switch (status) {
    case "user_full":
      return friendLimitMessage(MAX_FRIENDS);
    case "partner_full":
      return `Their friend list is full (${MAX_FRIENDS}/${MAX_FRIENDS}).`;
    case "invalid":
      return "Invalid friend request.";
    default:
      return `Could not accept friendship (${status}).`;
  }
}

export async function acceptFriendshipPair(
  supabase: SupabaseClient,
  userId: string,
  partnerId: string,
  connectionType: FriendConnectionType = "request"
): Promise<void> {
  const { data: status, error } = await supabase.rpc(
    "accept_friendship_if_under_cap",
    {
      p_user_id: userId,
      p_partner_id: partnerId,
      p_connection_type: connectionType,
      p_max_friends: MAX_FRIENDS,
    }
  );

  if (error) {
    const missingRpc =
      error.code === "PGRST202" ||
      error.message.toLowerCase().includes("accept_friendship_if_under_cap");

    if (missingRpc) {
      await acceptFriendshipPairLegacy(
        supabase,
        userId,
        partnerId,
        connectionType
      );
      return;
    }

    throw new Error(error.message);
  }

  if (status === "ok" || status === "already_friends") {
    return;
  }

  throw new Error(rpcAcceptError(String(status)));
}

/** Both users tapped spark in chat — create accepted friendship both ways. */
export async function ensureMutualSparkFriendship(
  supabase: SupabaseClient,
  userId: string,
  partnerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(user_id.eq.${userId},friend_id.eq.${partnerId}),and(user_id.eq.${partnerId},friend_id.eq.${userId})`
    )
    .limit(1);

  if (existing?.length) {
    return { ok: true };
  }

  const capacity = await assertFriendCapacityForPair(
    supabase,
    userId,
    partnerId
  );
  if (!capacity.ok) {
    return { ok: false, error: capacity.error };
  }

  try {
    await acceptFriendshipPair(supabase, userId, partnerId, "mutual_connect");
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not add mutual spark friend.";
    return { ok: false, error: message };
  }
}

export async function removeFriendshipPair(
  supabase: SupabaseClient,
  userId: string,
  partnerId: string
): Promise<void> {
  await supabase
    .from("friendships")
    .delete()
    .or(
      `and(user_id.eq.${userId},friend_id.eq.${partnerId}),and(user_id.eq.${partnerId},friend_id.eq.${userId})`
    );
}
