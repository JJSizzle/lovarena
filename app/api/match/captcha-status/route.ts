import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import {
  hasMatchCaptchaGrant,
  isMatchCaptchaRequired,
} from "@/lib/security/match-captcha";

export async function GET() {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const required = isMatchCaptchaRequired(auth.profile.created_at);
    if (!required) {
      return NextResponse.json({ required: false, satisfied: true });
    }

    const supabase = createAdminClient();
    const satisfied = await hasMatchCaptchaGrant(supabase, auth.profile.id);

    return NextResponse.json({ required: true, satisfied });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Captcha status check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
