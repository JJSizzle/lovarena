import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isNewAccount } from "@/lib/rate-limit-tiers";
import {
  isTurnstileConfigured,
  verifyTurnstileToken,
} from "@/lib/security/turnstile";

export async function hasMatchCaptchaGrant(
  supabase: SupabaseClient,
  profileId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("match_captcha_grants")
    .select("profile_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!data?.profile_id) return false;

  return true;
}

export function isMatchCaptchaRequired(profileCreatedAt: string): boolean {
  return isTurnstileConfigured() && isNewAccount(profileCreatedAt);
}

export async function grantMatchCaptcha(
  supabase: SupabaseClient,
  profileId: string
): Promise<void> {
  await supabase.from("match_captcha_grants").upsert({
    profile_id: profileId,
    verified_at: new Date().toISOString(),
  });
}

export async function assertMatchCaptchaAccess(
  supabase: SupabaseClient,
  profileId: string,
  profileCreatedAt: string,
  turnstileToken: string | undefined | null,
  ip: string
): Promise<NextResponse | null> {
  if (!isMatchCaptchaRequired(profileCreatedAt)) {
    return null;
  }

  if (await hasMatchCaptchaGrant(supabase, profileId)) {
    return null;
  }

  const verify = await verifyTurnstileToken(turnstileToken, ip);
  if (!verify.ok) {
    return NextResponse.json(
      {
        error: verify.error,
        needsCaptcha: true,
      },
      { status: 403 }
    );
  }

  await grantMatchCaptcha(supabase, profileId);
  return null;
}
