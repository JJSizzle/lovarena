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
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

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

    const { friendId, action } = await req.json();
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
      await acceptFriendshipPair(supabase, auth.profile.id, friendId);
      return NextResponse.json({
        ok: true,
        friendStatus: "friends",
        message: "Friend request accepted!",
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
      await acceptFriendshipPair(supabase, auth.profile.id, friendId);
      return NextResponse.json({
        ok: true,
        friendStatus: "friends",
        message: "They already requested you — you are now friends!",
      });
    }

    const { error } = await supabase.from("friendships").insert({
      user_id: auth.profile.id,
      friend_id: friendId,
      status: "pending",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      friendStatus: "pending_sent",
      message: "Friend request sent. They can accept from their profile.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
