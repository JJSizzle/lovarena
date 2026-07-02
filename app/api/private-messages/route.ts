import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBlockedEitherWay, requireAuthProfile } from "@/lib/auth/api-auth";
import { areFriends } from "@/lib/friends/are-friends";
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
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const friendId = req.nextUrl.searchParams.get("friendId");
    if (!friendId) {
      return NextResponse.json({ error: "Missing friendId" }, { status: 400 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`dm-read:${auth.profile.id}:${ip}`, 120, 60);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const supabase = createAdminClient();

    if (!(await areFriends(auth.profile.id, friendId, supabase))) {
      return NextResponse.json({ error: "Not friends" }, { status: 403 });
    }

    if (await isBlockedEitherWay(auth.profile.id, friendId)) {
      return NextResponse.json(
        { error: "Cannot message a blocked user." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("private_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${auth.profile.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${auth.profile.id})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const peerLastReadAt = await getPeerReadReceiptAt(
      supabase,
      friendId,
      auth.profile.id
    );

    return NextResponse.json({ messages: data, peerLastReadAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<{ friendId?: string; content?: string }>(req);
    if (!parsed.ok) return parsed.response;
    const { friendId, content } = parsed.data;
    if (!friendId || !content?.trim()) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`dm-send:${auth.profile.id}:${ip}`, 40, 60);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const supabase = createAdminClient();

    const restriction = await getRestrictionApiPayload(supabase, auth.profile.id);
    if (restriction) {
      return NextResponse.json(
        {
          ...restriction,
          violation: true,
        },
        { status: 403 }
      );
    }

    if (!(await areFriends(auth.profile.id, friendId, supabase))) {
      return NextResponse.json({ error: "Not friends" }, { status: 403 });
    }

    if (await isBlockedEitherWay(auth.profile.id, friendId)) {
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
          auth.profile.id,
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
        sender_id: auth.profile.id,
        receiver_id: friendId,
        content: text,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    void notifyFriendMessageEmail({
      receiverId: friendId,
      senderId: auth.profile.id,
      senderUsername: auth.profile.username ?? "A friend",
      preview: text,
    });

    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lovarena.app";
    void sendWebPushToUser(supabase, friendId, {
      title: `${auth.profile.username ?? "A friend"} messaged you`,
      body: text.length > 100 ? `${text.slice(0, 97)}…` : text,
      url: `${site}/friends?chat=${encodeURIComponent(auth.profile.id)}`,
      tag: `dm-${auth.profile.id}`,
    });

    return NextResponse.json({ message: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
