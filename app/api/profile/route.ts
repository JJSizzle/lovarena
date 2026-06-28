import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGenderIdentity, isLookingFor, isValidUsername } from "@/lib/profile-orientation";
import { sanitizeInterests, sanitizeLanguages } from "@/lib/profile-tags";
import { isAvatarEmoji } from "@/lib/avatars";
import { isValidAge } from "@/lib/profile-age";

const PROFILE_FIELDS =
  "id, username, age, show_age, age_verified, is_admin, gender_identity, looking_for, bio, interests, languages, avatar_url, avatar_emoji, reputation_score, referral_code, notifications_enabled, face_blur_default, voice_only_default, chat_streak, positive_ratings, created_at";

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
    if ("age" in body) {
      const age = body.age;
      if (age === null || age === "") {
        updates.age = null;
      } else {
        const parsed = Number(age);
        if (!isValidAge(parsed)) {
          return NextResponse.json(
            { error: "Age must be between 18 and 120." },
            { status: 400 }
          );
        }
        updates.age = parsed;
      }
    }
    if ("show_age" in body) {
      updates.show_age = Boolean(body.show_age);
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
    if ("voice_only_default" in body) {
      updates.voice_only_default = Boolean(body.voice_only_default);
    }
    if ("avatar_emoji" in body) {
      const emoji = String(body.avatar_emoji ?? "");
      if (!isAvatarEmoji(emoji)) {
        return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
      }
      updates.avatar_emoji = emoji;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existing) {
      const username =
        typeof updates.username === "string"
          ? updates.username
          : `user_${user.id.replace(/-/g, "").slice(0, 8)}`;

      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          username,
          age_verified: Boolean(updates.age_verified),
          ...updates,
        })
        .select(PROFILE_FIELDS)
        .single();

      if (insertError) {
        const message =
          insertError.code === "23505"
            ? "That username is already taken."
            : insertError.message;
        return NextResponse.json({ error: message }, { status: 500 });
      }

      return NextResponse.json({ profile: inserted });
    }

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
