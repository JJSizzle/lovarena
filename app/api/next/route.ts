import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { getRestrictionApiPayload } from "@/lib/moderation/enforce-violation";
import { processQualifiedChat } from "@/lib/referral/process-qualified-chat";
import { applyNextRateLimit } from "@/lib/rate-limit-tiers";
import { clientIp } from "@/lib/rate-limit";

import { isValidUsStateCode } from "@/lib/us-states";
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { profile } = auth;
    const parsed = await parseJsonBody<{
      roomId?: string;
      matchMode?: string;
      countryCode?: string;
      stateCode?: string;
      preferSharedInterests?: boolean;
      preferSharedLanguages?: boolean;
      verifiedOnly?: boolean;
    }>(req);
    if (!parsed.ok) return parsed.response;
    const { roomId, matchMode, countryCode, stateCode, preferSharedInterests, preferSharedLanguages, verifiedOnly } =
      parsed.data;

    const ip = clientIp(req);
    const rl = await applyNextRateLimit(
      profile.id,
      ip,
      profile.created_at,
      profile.reputation_score
    );
    if (!rl.allowed) return rl.response;

    const mode = matchMode === "regional" ? "regional" : "worldwide";
    if (mode === "regional" && !countryCode) {
      return NextResponse.json(
        { error: "Country required for regional matchmaking" },
        { status: 400 }
      );
    }

    let normalizedState: string | null = null;
    if (
      mode === "regional" &&
      countryCode === "US" &&
      stateCode &&
      isValidUsStateCode(stateCode)
    ) {
      normalizedState = String(stateCode).toUpperCase();
    }

    const supabase = createAdminClient();
    let referralReward: { rewarded: boolean; message: string } | null = null;

    const restriction = await getRestrictionApiPayload(supabase, profile.id);
    if (restriction) {
      return NextResponse.json(restriction, { status: 403 });
    }

    if (roomId) {
      referralReward = await processQualifiedChat(supabase, profile.id, roomId);

      await supabase.rpc("leave_chat", {
        p_user_id: profile.id,
        p_room_id: roomId,
      });
    } else {
      await supabase.from("waiting_users").delete().eq("user_id", profile.id);
    }

    const { data: newRoomId, error } = await supabase.rpc(
      "find_or_create_match",
      {
        p_user_id: profile.id,
        p_match_mode: mode,
        p_country_code: mode === "regional" ? countryCode : null,
        p_prefer_shared_interests: Boolean(preferSharedInterests),
        p_state_code: normalizedState,
        p_prefer_shared_languages: Boolean(preferSharedLanguages),
        p_verified_only: Boolean(verifiedOnly),
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      roomId: newRoomId,
      userId: profile.id,
      referralReward,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Next match request failed unexpectedly";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
