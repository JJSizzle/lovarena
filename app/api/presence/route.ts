import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { inQueue, inChat } = await req.json();
    const supabase = createAdminClient();

    const { error } = await supabase.from("user_presence").upsert({
      user_id: auth.profile.id,
      last_seen_at: new Date().toISOString(),
      in_queue: Boolean(inQueue),
      in_chat: Boolean(inChat),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Presence update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
