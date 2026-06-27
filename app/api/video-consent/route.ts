import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  requireAuthProfile,
} from "@/lib/auth/api-auth";

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
      .from("room_video_consent")
      .select("profile_id")
      .eq("room_id", roomId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const consented = (data ?? []).map((row) => row.profile_id);
    const bothRevealed = consented.length >= 2;

    return NextResponse.json({
      youConsented: consented.includes(auth.profile.id),
      bothRevealed,
      consentedCount: consented.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Consent check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { roomId } = await req.json();
    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const membership = await assertRoomMember(roomId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const supabase = createAdminClient();
    const { error } = await supabase.from("room_video_consent").upsert({
      room_id: roomId,
      profile_id: auth.profile.id,
      consented_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = await supabase
      .from("room_video_consent")
      .select("profile_id")
      .eq("room_id", roomId);

    const consented = (data ?? []).map((row) => row.profile_id);

    return NextResponse.json({
      ok: true,
      bothRevealed: consented.length >= 2,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Consent failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
