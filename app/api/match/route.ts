import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { isUserFlaggedForAbuse } from "@/lib/moderation/enforce-violation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { profile } = auth;
    const { matchMode, countryCode } = await req.json();

    const ip = clientIp(req);
    const rl = await rateLimit(`match:${profile.id}:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many match requests. Please wait a minute." },
        { status: 429 }
      );
    }

    const mode = matchMode === "regional" ? "regional" : "worldwide";
    if (mode === "regional" && !countryCode) {
      return NextResponse.json(
        { error: "Country required for regional matchmaking" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (await isUserFlaggedForAbuse(supabase, profile.id)) {
      return NextResponse.json(
        {
          error:
            "Your account is restricted due to a community guidelines violation.",
          flagged: true,
        },
        { status: 403 }
      );
    }

    const { data: roomId, error } = await supabase.rpc("find_or_create_match", {
      p_user_id: profile.id,
      p_match_mode: mode,
      p_country_code: mode === "regional" ? countryCode : null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ roomId, userId: profile.id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Match request failed unexpectedly";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
