import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { userId, matchMode, countryCode } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const mode = matchMode === "regional" ? "regional" : "worldwide";
    if (mode === "regional" && !countryCode) {
      return NextResponse.json(
        { error: "Country required for regional matchmaking" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: roomId, error } = await supabase.rpc("find_or_create_match", {
      p_user_id: userId,
      p_match_mode: mode,
      p_country_code: mode === "regional" ? countryCode : null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ roomId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Match request failed unexpectedly";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
