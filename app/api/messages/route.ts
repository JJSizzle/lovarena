import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import {
  enforceSevereViolation,
  getRestrictionApiPayload,
} from "@/lib/moderation/enforce-violation";
import { moderateMessageContent } from "@/lib/moderation/moderate-message";
import {
  applyTieredRateLimit,
  MESSAGE_RATE_TIERS,
} from "@/lib/rate-limit-tiers";
import { clientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const roomId = req.nextUrl.searchParams.get("roomId");
    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const membership = await assertRoomMember(roomId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { profile } = auth;
    const { roomId, content } = await req.json();

    if (!roomId || !content?.trim()) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const ip = clientIp(req);
    const rl = await applyTieredRateLimit(
      "msg",
      profile.id,
      ip,
      profile.created_at,
      MESSAGE_RATE_TIERS
    );
    if (!rl.allowed) return rl.response;

    const membership = await assertRoomMember(roomId, profile.id);
    if ("error" in membership) return membership.error;

    if (membership.room.status !== "active") {
      return NextResponse.json({ error: "Room is not active" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const restriction = await getRestrictionApiPayload(supabase, profile.id);
    if (restriction) {
      return NextResponse.json(
        {
          ...restriction,
          violation: true,
          sessionTerminated: true,
        },
        { status: 403 }
      );
    }

    const text = content.trim();
    const moderation = moderateMessageContent(text);

    if (!moderation.allowed) {
      if (moderation.kind === "severe") {
        await enforceSevereViolation(supabase, profile.id, roomId);
        return NextResponse.json(
          {
            error:
              "Message blocked. This chat has been ended due to a severe policy violation.",
            violation: true,
            sessionTerminated: true,
          },
          { status: 403 }
        );
      }

      return NextResponse.json({ error: moderation.userMessage }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        sender_id: profile.id,
        content: text,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
