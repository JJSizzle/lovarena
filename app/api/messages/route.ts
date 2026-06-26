import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enforceSevereViolation,
  isUserFlaggedForAbuse,
} from "@/lib/moderation/enforce-violation";
import { scanMessageForSevereViolation } from "@/lib/moderation/scan-message";

export async function GET(req: NextRequest) {
  try {
    const roomId = req.nextUrl.searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

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
    const { roomId, senderId, content } = await req.json();

    if (!roomId || !senderId || !content?.trim()) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (await isUserFlaggedForAbuse(supabase, senderId)) {
      return NextResponse.json(
        {
          error: "Your session is restricted due to a community guidelines violation.",
          violation: true,
          sessionTerminated: true,
        },
        { status: 403 }
      );
    }

    const text = content.trim();
    const scan = scanMessageForSevereViolation(text);

    if (scan.violation) {
      await enforceSevereViolation(supabase, senderId, roomId);

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

    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        sender_id: senderId,
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
