import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { sessionUserId, ageVerified } = await req.json();
    if (!sessionUserId) {
      return NextResponse.json({ error: "Missing sessionUserId" }, { status: 400 });
    }

    const supabase = createAdminClient();

    await supabase.from("room_session_links").upsert({
      session_user_id: sessionUserId,
      profile_id: user.id,
    });

    if (ageVerified) {
      await supabase
        .from("profiles")
        .update({ age_verified: true })
        .eq("id", user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Link failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
