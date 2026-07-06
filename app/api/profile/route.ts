import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGenderIdentity, isLookingFor } from "@/lib/profile-orientation";
import {
  isPlaceholderUsername,
  MAX_USERNAME_CHANGES,
  usernamesEqual,
  validateUsername,
} from "@/lib/username";
import { sanitizeInterests, sanitizeLanguages } from "@/lib/profile-tags";
import { sanitizePrimaryLanguage } from "@/lib/translation/language-codes";
import { isAvatarEmoji } from "@/lib/avatars";
import { isValidAge } from "@/lib/profile-age";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { isValidCountryCode } from "@/lib/countries";
import { isValidUsStateCode } from "@/lib/us-states";
import { parseJsonBody } from "@/lib/api/parse-json-body";

const PROFILE_FIELDS =
  "id, username, username_change_count, age, show_age, age_verified, id_verified, is_admin, gender_identity, looking_for, bio, interests, languages, avatar_url, avatar_emoji, reputation_score, referral_code, notifications_enabled, read_receipts_enabled, web_push_enabled, face_blur_default, voice_only_default, allow_friend_requests, allow_mutual_spark, chat_streak, positive_ratings, qualified_referrals, referred_by, primary_language, auto_translate, country_code, state_code, created_at";

async function isUsernameTaken(
  supabase: ReturnType<typeof createAdminClient>,
  username: string,
  excludeUserId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .neq("id", excludeUserId)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

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

    const parsed = await parseJsonBody<Record<string, unknown>>(req);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const updates: Record<string, unknown> = {};

    const ip = clientIp(req);
    const rl = await rateLimit(`profile:${user.id}:${ip}`, 40, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
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
      const usernameCheck = validateUsername(username);
      if (!usernameCheck.valid) {
        return NextResponse.json(
          { error: usernameCheck.error ?? "Invalid username." },
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
      if (url) {
        if (!/^https?:\/\/.+/i.test(url)) {
          return NextResponse.json(
            { error: "Avatar must be a valid https URL" },
            { status: 400 }
          );
        }
        const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
        const allowedPrefix = supabaseBase
          ? `${supabaseBase}/storage/v1/object/public/avatars/${user.id}/`
          : null;
        if (allowedPrefix && !url.startsWith(allowedPrefix)) {
          return NextResponse.json(
            { error: "Upload your photo through the profile uploader." },
            { status: 400 }
          );
        }
      }
      updates.avatar_url = url || null;
    }
    if ("notifications_enabled" in body) {
      updates.notifications_enabled = Boolean(body.notifications_enabled);
    }
    if ("read_receipts_enabled" in body) {
      updates.read_receipts_enabled = Boolean(body.read_receipts_enabled);
    }
    if ("web_push_enabled" in body) {
      updates.web_push_enabled = Boolean(body.web_push_enabled);
    }
    if ("face_blur_default" in body) {
      updates.face_blur_default = Boolean(body.face_blur_default);
    }
    if ("voice_only_default" in body) {
      updates.voice_only_default = Boolean(body.voice_only_default);
    }
    if ("allow_friend_requests" in body) {
      updates.allow_friend_requests = Boolean(body.allow_friend_requests);
    }
    if ("allow_mutual_spark" in body) {
      updates.allow_mutual_spark = Boolean(body.allow_mutual_spark);
    }
    if ("primary_language" in body) {
      updates.primary_language = sanitizePrimaryLanguage(body.primary_language);
    }
    if ("auto_translate" in body) {
      updates.auto_translate = Boolean(body.auto_translate);
    }
    if ("avatar_emoji" in body) {
      const emoji = String(body.avatar_emoji ?? "");
      if (!isAvatarEmoji(emoji)) {
        return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
      }
      updates.avatar_emoji = emoji;
    }
    if ("country_code" in body) {
      const raw = body.country_code;
      if (raw === null || raw === "") {
        updates.country_code = null;
        updates.state_code = null;
      } else {
        const code = String(raw).trim().toUpperCase();
        if (!isValidCountryCode(code)) {
          return NextResponse.json({ error: "Invalid country" }, { status: 400 });
        }
        updates.country_code = code;
        if (code !== "US") {
          updates.state_code = null;
        }
      }
    }
    if ("state_code" in body) {
      const raw = body.state_code;
      if (raw === null || raw === "") {
        updates.state_code = null;
      } else {
        const state = String(raw).trim().toUpperCase();
        if (!isValidUsStateCode(state)) {
          return NextResponse.json({ error: "Invalid state" }, { status: 400 });
        }
        updates.state_code = state;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id, username, username_change_count, country_code")
      .eq("id", user.id)
      .maybeSingle();

    const effectiveCountry =
      typeof updates.country_code === "string"
        ? updates.country_code
        : existing?.country_code ?? null;

    if (updates.state_code && effectiveCountry?.toUpperCase() !== "US") {
      return NextResponse.json(
        { error: "State is only available when country is United States." },
        { status: 400 }
      );
    }

    if (typeof updates.username === "string") {
      const nextUsername = updates.username;

      if (existing && usernamesEqual(nextUsername, existing.username)) {
        delete updates.username;
      } else if (await isUsernameTaken(supabase, nextUsername, user.id)) {
        return NextResponse.json(
          { error: "That username is already taken." },
          { status: 409 }
        );
      } else if (existing) {
        const changeCount = existing.username_change_count ?? 0;
        const fromPlaceholder = isPlaceholderUsername(existing.username);

        if (!fromPlaceholder && changeCount >= MAX_USERNAME_CHANGES) {
          return NextResponse.json(
            {
              error: `You have used all ${MAX_USERNAME_CHANGES} username changes. Your username is permanent.`,
            },
            { status: 400 }
          );
        }

        if (!fromPlaceholder) {
          updates.username_change_count = changeCount + 1;
        }
      } else if (await isUsernameTaken(supabase, nextUsername, user.id)) {
        return NextResponse.json(
          { error: "That username is already taken." },
          { status: 409 }
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      const { data: current } = await supabase
        .from("profiles")
        .select(PROFILE_FIELDS)
        .eq("id", user.id)
        .maybeSingle();
      return NextResponse.json({ profile: current });
    }

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
          age_verified: false,
          username_change_count: 0,
          ...updates,
        })
        .select(PROFILE_FIELDS)
        .single();

      if (insertError) {
        const message =
          insertError.code === "23505"
            ? "That username is already taken."
            : insertError.message;
        return NextResponse.json(
          { error: message },
          { status: insertError.code === "23505" ? 409 : 500 }
        );
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
      return NextResponse.json(
        { error: message },
        { status: error.code === "23505" ? 409 : 500 }
      );
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

    const parsed = await parseJsonBody<{ confirm?: string }>(req);
    if (!parsed.ok) return parsed.response;
    const { confirm } = parsed.data;
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
