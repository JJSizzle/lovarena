import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";

export async function POST() {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("bump_chat_streak", {
      p_user_id: auth.profile.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ streak: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Streak update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
