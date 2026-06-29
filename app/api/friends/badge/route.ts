import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";

export async function GET() {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("friend_id", auth.profile.id)
      .eq("status", "pending");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ incomingCount: count ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Badge fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
