import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: onlineCount, error: onlineError } = await supabase.rpc(
      "online_user_count",
      { p_window_seconds: 120 }
    );

    if (onlineError) {
      return NextResponse.json({ error: onlineError.message }, { status: 500 });
    }

    const { count: queueCount } = await supabase
      .from("waiting_users")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      online: onlineCount ?? 0,
      inQueue: queueCount ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stats unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
