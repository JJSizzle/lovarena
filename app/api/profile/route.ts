import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGenderIdentity, isLookingFor } from "@/lib/profile-orientation";

const PROFILE_FIELDS =
  "id, username, age_verified, is_admin, gender_identity, looking_for";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_FIELDS)
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

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if ("age_verified" in body) {
      updates.age_verified = Boolean(body.age_verified);
    }
    if ("gender_identity" in body) {
      if (!isGenderIdentity(body.gender_identity)) {
        return NextResponse.json(
          { error: "Invalid gender identity" },
          { status: 400 }
        );
      }
      updates.gender_identity = body.gender_identity;
    }
    if ("looking_for" in body) {
      if (!isLookingFor(body.looking_for)) {
        return NextResponse.json(
          { error: "Invalid match preference" },
          { status: 400 }
        );
      }
      updates.looking_for = body.looking_for;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select(PROFILE_FIELDS)
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
