import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, age_verified")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Profile fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { age_verified } = await req.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("profiles")
      .update({ age_verified: Boolean(age_verified) })
      .eq("id", user.id)
      .select("id, username, age_verified")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Profile update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
