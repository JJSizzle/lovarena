import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPersonaInquiry } from "@/lib/identity/persona";
import {
  isIdVerificationPublic,
  isPersonaConfigured,
} from "@/lib/identity/persona-config";

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isPersonaConfigured()) {
      return NextResponse.json(
        { error: "ID verification is not available yet. Check back soon." },
        { status: 503 }
      );
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id_verified, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!isIdVerificationPublic() && !profile?.is_admin) {
      return NextResponse.json(
        { error: "ID verification is launching soon. Check back shortly." },
        { status: 503 }
      );
    }

    if (profile?.id_verified) {
      return NextResponse.json({ error: "You are already ID verified." }, { status: 400 });
    }

    const { inquiryId, inquiryUrl } = await createPersonaInquiry(user.id);

    await supabase
      .from("profiles")
      .update({ persona_inquiry_id: inquiryId })
      .eq("id", user.id);

    return NextResponse.json({ inquiryId, inquiryUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start verification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
