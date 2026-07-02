import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isBlockedEitherWay,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import {
  acceptFriendshipPair,
  friendLinkStatus,
} from "@/lib/friends/friend-link-status";
import { verifyRecentMatch } from "@/lib/moderation/report-reputation";
import {
  notifyFriendRequestAccepted,
  notifyFriendRequestReceived,
} from "@/lib/notifications/friend-request-email";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import {
  allowsFriendRequests,
} from "@/lib/social-privacy";
import {
  assertFriendCapacityForPair,
  friendLimitMessage,
  isAtFriendLimit,
} from "@/lib/friends/limits";
import { countAcceptedFriends } from "@/lib/friends/are-friends";
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const ip = clientIp(req);
    const rl = await rateLimit(
      `friend-request:${auth.profile.id}:${ip}`,
      15,
      3600
    );
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const parsed = await parseJsonBody<{ friendId?: string; action?: string }>(req);
    if (!parsed.ok) return parsed.response;
    const { friendId, action } = parsed.data;
    if (!friendId || friendId === auth.profile.id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (await isBlockedEitherWay(auth.profile.id, friendId)) {
      return NextResponse.json(
        { error: "Cannot add a blocked user." },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    const { data: rows } = await supabase
      .from("friendships")
      .select("user_id, friend_id, status")
      .or(
        `and(user_id.eq.${auth.profile.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${auth.profile.id})`
      );

    const status = friendLinkStatus(
      auth.profile.id,
      friendId,
      rows ?? []
    );

    if (action === "cancel") {
      if (status !== "pending_sent") {
        return NextResponse.json(
          { error: "No outgoing friend request to cancel." },
          { status: 400 }
        );
      }
      const { error: cancelError } = await supabase
        .from("friendships")
        .delete()
        .eq("user_id", auth.profile.id)
        .eq("friend_id", friendId)
        .eq("status", "pending");

      if (cancelError) {
        return NextResponse.json({ error: cancelError.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        friendStatus: "none",
        message: "Friend request cancelled.",
      });
    }

    const matched = await verifyRecentMatch(
      supabase,
      auth.profile.id,
      friendId
    );
    if (!matched) {
      return NextResponse.json(
        {
          error:
            "You can only add friends from someone you matched with recently.",
        },
        { status: 400 }
      );
    }

    if (status === "friends") {
      return NextResponse.json({
        ok: true,
        friendStatus: "friends",
        message: "You are already friends.",
      });
    }

    if (action === "accept") {
      if (status !== "pending_received") {
        return NextResponse.json(
          { error: "No friend request to accept." },
          { status: 400 }
        );
      }
      const capacity = await assertFriendCapacityForPair(
        supabase,
        auth.profile.id,
        friendId
      );
      if (!capacity.ok) {
        return NextResponse.json({ error: capacity.error }, { status: 400 });
      }
      await acceptFriendshipPair(supabase, auth.profile.id, friendId);
      void notifyFriendRequestAccepted({
        requesterId: friendId,
        accepterId: auth.profile.id,
        accepterUsername: auth.profile.username,
      }).catch(() => {});
      return NextResponse.json({
        ok: true,
        friendStatus: "friends",
        connectionType: "request",
        message: "Friend request accepted!",
      });
    }

    if (action === "decline") {
      if (status !== "pending_received") {
        return NextResponse.json(
          { error: "No friend request to decline." },
          { status: 400 }
        );
      }
      const { error: declineError } = await supabase
        .from("friendships")
        .delete()
        .eq("user_id", friendId)
        .eq("friend_id", auth.profile.id)
        .eq("status", "pending");

      if (declineError) {
        return NextResponse.json({ error: declineError.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        friendStatus: "none",
        message: "Friend request declined.",
      });
    }

    if (status === "pending_sent") {
      return NextResponse.json({
        ok: true,
        friendStatus: "pending_sent",
        message: "Friend request already sent.",
      });
    }

    if (status === "pending_received") {
      const capacity = await assertFriendCapacityForPair(
        supabase,
        auth.profile.id,
        friendId
      );
      if (!capacity.ok) {
        return NextResponse.json({ error: capacity.error }, { status: 400 });
      }
      await acceptFriendshipPair(supabase, auth.profile.id, friendId);
      void notifyFriendRequestAccepted({
        requesterId: friendId,
        accepterId: auth.profile.id,
        accepterUsername: auth.profile.username,
      }).catch(() => {});
      return NextResponse.json({
        ok: true,
        friendStatus: "friends",
        connectionType: "request",
        message: "They already requested you — you are now friends!",
      });
    }

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("username, allow_friend_requests")
      .eq("id", friendId)
      .maybeSingle();

    if (!allowsFriendRequests(targetProfile?.allow_friend_requests)) {
      return NextResponse.json(
        {
          error: `${targetProfile?.username ?? "This user"} isn't accepting friend requests right now.`,
        },
        { status: 403 }
      );
    }

    const senderCount = await countAcceptedFriends(auth.profile.id, supabase);
    if (isAtFriendLimit(senderCount)) {
      return NextResponse.json(
        { error: friendLimitMessage(senderCount) },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("friendships").insert({
      user_id: auth.profile.id,
      friend_id: friendId,
      status: "pending",
      connection_type: "request",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    void notifyFriendRequestReceived({
      receiverId: friendId,
      senderId: auth.profile.id,
      senderUsername: auth.profile.username,
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      friendStatus: "pending_sent",
      message: "Friend request sent. They can accept from Friends or Profile.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
