import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { getRestrictionApiPayload } from "@/lib/moderation/enforce-violation";
import {
  applyIpRateLimit,
  applyTieredRateLimit,
  MATCH_IP_RATE,
  MATCH_RATE_TIERS,
} from "@/lib/rate-limit-tiers";
import { assertMatchCaptchaAccess } from "@/lib/security/match-captcha";
import { clientIp } from "@/lib/rate-limit";

import { isValidUsStateCode } from "@/lib/us-states";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { profile } = auth;
    const { matchMode, countryCode, stateCode, preferSharedInterests, preferSharedLanguages, turnstileToken } =
      await req.json();

    const ip = clientIp(req);

    const supabase = createAdminClient();

    const captchaBlock = await assertMatchCaptchaAccess(
      supabase,
      profile.id,
      profile.created_at,
      turnstileToken,
      ip
    );
    if (captchaBlock) return captchaBlock;

    const ipRl = await applyIpRateLimit("match-ip", ip, MATCH_IP_RATE);
    if (!ipRl.allowed) return ipRl.response;

    const rl = await applyTieredRateLimit(
      "match",
      profile.id,
      ip,
      profile.created_at,
      MATCH_RATE_TIERS
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

    const restriction = await getRestrictionApiPayload(supabase, profile.id);
    if (restriction) {
      return NextResponse.json(restriction, { status: 403 });
    }

    const { data: roomId, error } = await supabase.rpc("find_or_create_match", {
      p_user_id: profile.id,
      p_match_mode: mode,
      p_country_code: mode === "regional" ? countryCode : null,
      p_prefer_shared_interests: Boolean(preferSharedInterests),
      p_state_code: normalizedState,
      p_prefer_shared_languages: Boolean(preferSharedLanguages),
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
