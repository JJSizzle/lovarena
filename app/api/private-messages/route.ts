import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBlockedEitherWay } from "@/lib/auth/api-auth";
import { moderateMessageContent } from "@/lib/moderation/moderate-message";
import {
  applyTimedRestriction,
  getRestrictionApiPayload,
} from "@/lib/moderation/user-restriction";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { notifyFriendMessageEmail } from "@/lib/notifications/friend-message-email";
import { sendWebPushToUser } from "@/lib/notifications/web-push";
import { getPeerReadReceiptAt } from "@/lib/dm/read-cursors";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const friendId = req.nextUrl.searchParams.get("friendId");
    if (!friendId) {
      return NextResponse.json({ error: "Missing friendId" }, { status: 400 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`dm-read:${user.id}:${ip}`, 120, 60);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const supabase = createAdminClient();

    const { data: friendship } = await supabase
      .from("friendships")
      .select("id")
      .eq("user_id", user.id)
      .eq("friend_id", friendId)
      .eq("status", "accepted")
      .maybeSingle();

    if (!friendship) {
      return NextResponse.json({ error: "Not friends" }, { status: 403 });
    }

    if (await isBlockedEitherWay(user.id, friendId)) {
      return NextResponse.json(
        { error: "Cannot message a blocked user." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("private_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const peerLastReadAt = await getPeerReadReceiptAt(
      supabase,
      friendId,
      user.id
    );

    return NextResponse.json({ messages: data, peerLastReadAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { friendId, content } = await req.json();
    if (!friendId || !content?.trim()) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`dm-send:${user.id}:${ip}`, 40, 60);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const supabase = createAdminClient();

    const restriction = await getRestrictionApiPayload(supabase, user.id);
    if (restriction) {
      return NextResponse.json(
        {
          ...restriction,
          violation: true,
        },
        { status: 403 }
      );
    }

    const { data: friendship } = await supabase
      .from("friendships")
      .select("id")
      .eq("user_id", user.id)
      .eq("friend_id", friendId)
      .eq("status", "accepted")
      .maybeSingle();

    if (!friendship) {
      return NextResponse.json({ error: "Not friends" }, { status: 403 });
    }

    if (await isBlockedEitherWay(user.id, friendId)) {
      return NextResponse.json(
        { error: "Cannot message a blocked user." },
        { status: 403 }
      );
    }

    const text = content.trim();
    const moderation = moderateMessageContent(text);

    if (!moderation.allowed) {
      if (moderation.kind === "severe") {
        await applyTimedRestriction(
          supabase,
          user.id,
          "severe_hate_speech_or_slur"
        );
        return NextResponse.json(
          {
            error: "Message blocked due to policy violation.",
            violation: true,
          },
          { status: 403 }
        );
      }

      return NextResponse.json({ error: moderation.userMessage }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("private_messages")
      .insert({
        sender_id: user.id,
        receiver_id: friendId,
        content: text,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    void notifyFriendMessageEmail({
      receiverId: friendId,
      senderId: user.id,
      senderUsername: senderProfile?.username ?? "A friend",
      preview: text,
    });

    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lovarena.app";
    void sendWebPushToUser(supabase, friendId, {
      title: `${senderProfile?.username ?? "A friend"} messaged you`,
      body: text.length > 100 ? `${text.slice(0, 97)}…` : text,
      url: `${site}/friends?chat=${encodeURIComponent(user.id)}`,
      tag: `dm-${user.id}`,
    });

    return NextResponse.json({ message: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
