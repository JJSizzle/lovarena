import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REP_ID_VERIFICATION_BONUS } from "@/lib/reputation";
import { isPersonaConfigured } from "@/lib/identity/persona-config";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id_verified, id_verified_at")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      idVerified: profile?.id_verified === true,
      idVerifiedAt: profile?.id_verified_at ?? null,
      configured: isPersonaConfigured(),
      repBonus: REP_ID_VERIFICATION_BONUS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
