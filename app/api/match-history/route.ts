import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";

export async function GET() {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("match_history")
      .select("id, partner_id, room_id, created_at")
      .eq("user_id", auth.profile.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const partnerIds = [...new Set((data ?? []).map((row) => row.partner_id))];
    const { data: partners } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", partnerIds.length ? partnerIds : ["00000000-0000-0000-0000-000000000000"]);

    const nameById = new Map((partners ?? []).map((p) => [p.id, p.username]));

    return NextResponse.json({
      history: (data ?? []).map((row) => ({
        ...row,
        partnerUsername: nameById.get(row.partner_id) ?? "Stranger",
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "History fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
