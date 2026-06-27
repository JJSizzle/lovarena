import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGenderIdentity, isLookingFor, isValidUsername } from "@/lib/profile-orientation";
import { sanitizeInterests, sanitizeLanguages } from "@/lib/profile-tags";

const PROFILE_FIELDS =
  "id, username, age_verified, is_admin, gender_identity, looking_for, bio, interests, languages, avatar_url, reputation_score, referral_code, notifications_enabled, face_blur_default";

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

    return NextResponse.json({ profile: data, email: user.email });
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
    if ("username" in body) {
      const username = String(body.username).trim();
      if (!isValidUsername(username)) {
        return NextResponse.json(
          { error: "Username: 3–32 letters, numbers, or underscores." },
          { status: 400 }
        );
      }
      updates.username = username;
    }
    if ("gender_identity" in body) {
      if (!isGenderIdentity(body.gender_identity)) {
        return NextResponse.json({ error: "Invalid gender identity" }, { status: 400 });
      }
      updates.gender_identity = body.gender_identity;
    }
    if ("looking_for" in body) {
      if (!isLookingFor(body.looking_for)) {
        return NextResponse.json({ error: "Invalid match preference" }, { status: 400 });
      }
      updates.looking_for = body.looking_for;
    }
    if ("bio" in body) {
      updates.bio = String(body.bio ?? "").trim().slice(0, 280) || null;
    }
    if ("interests" in body) {
      updates.interests = sanitizeInterests(body.interests);
    }
    if ("languages" in body) {
      updates.languages = sanitizeLanguages(body.languages);
    }
    if ("avatar_url" in body) {
      const url = String(body.avatar_url ?? "").trim();
      if (url && !/^https?:\/\/.+/i.test(url)) {
        return NextResponse.json({ error: "Avatar must be a valid https URL" }, { status: 400 });
      }
      updates.avatar_url = url || null;
    }
    if ("notifications_enabled" in body) {
      updates.notifications_enabled = Boolean(body.notifications_enabled);
    }
    if ("face_blur_default" in body) {
      updates.face_blur_default = Boolean(body.face_blur_default);
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
      const message =
        error.code === "23505"
          ? "That username is already taken."
          : error.message;
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Profile update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { confirm } = await req.json();
    if (confirm !== "DELETE") {
      return NextResponse.json(
        { error: 'Send { "confirm": "DELETE" } to permanently delete your account.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Account deletion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
