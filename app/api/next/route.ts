import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { userId, roomId, matchMode, countryCode } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const mode = matchMode === "regional" ? "regional" : "worldwide";

    const supabase = createAdminClient();

    if (roomId) {
      await supabase.rpc("leave_chat", {
        p_user_id: userId,
        p_room_id: roomId,
      });
    } else {
      await supabase.from("waiting_users").delete().eq("user_id", userId);
    }

    const { data: newRoomId, error } = await supabase.rpc(
      "find_or_create_match",
      {
        p_user_id: userId,
        p_match_mode: mode,
        p_country_code: mode === "regional" ? countryCode : null,
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ roomId: newRoomId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Next match request failed unexpectedly";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
