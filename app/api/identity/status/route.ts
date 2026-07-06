import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REP_ID_VERIFICATION_BONUS } from "@/lib/reputation";
import {
  isIdVerificationPublic,
  isPersonaConfigured,
} from "@/lib/identity/persona-config";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id_verified, id_verified_at, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    const configured = isPersonaConfigured();
    const publiclyAvailable = isIdVerificationPublic();
    const canStart =
      configured &&
      !profile?.id_verified &&
      (publiclyAvailable || profile?.is_admin === true);

    return NextResponse.json({
      idVerified: profile?.id_verified === true,
      idVerifiedAt: profile?.id_verified_at ?? null,
      configured,
      publiclyAvailable,
      comingSoon: configured && !publiclyAvailable,
      canStart,
      repBonus: REP_ID_VERIFICATION_BONUS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
