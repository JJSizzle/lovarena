import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isGenderIdentity,
  isLookingFor,
  isOrientationProfileComplete,
  isValidUsername,
} from "@/lib/profile-orientation";

function usernameFromMeta(user: User): string {
  const meta = user.user_metadata ?? {};
  if (typeof meta.username === "string" && isValidUsername(meta.username)) {
    return meta.username;
  }
  return `user_${user.id.replace(/-/g, "").slice(0, 8)}`;
}

function orientationFromMeta(user: User) {
  const meta = user.user_metadata ?? {};
  const gender_identity = isGenderIdentity(meta.gender_identity)
    ? meta.gender_identity
    : null;
  const looking_for = isLookingFor(meta.looking_for) ? meta.looking_for : null;
  return { gender_identity, looking_for };
}

export async function resolvePostAuthRedirect(
  user: User,
  nextParam: string
): Promise<string> {
  const admin = createAdminClient();
  const username = usernameFromMeta(user);
  const { gender_identity, looking_for } = orientationFromMeta(user);

  const { data: profile } = await admin
    .from("profiles")
    .select("id, gender_identity, looking_for, username")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const insertRow: Record<string, unknown> = {
      id: user.id,
      username,
      age_verified: false,
    };
    if (gender_identity && looking_for) {
      insertRow.gender_identity = gender_identity;
      insertRow.looking_for = looking_for;
    }

    const { error: insertError } = await admin.from("profiles").insert(insertRow);
    if (insertError?.code === "23505") {
      insertRow.username = `${username}_${user.id.slice(0, 4)}`;
      await admin.from("profiles").insert(insertRow);
    }

    if (gender_identity && looking_for) {
      return appendQuery(nextParam, "confirmed", "1");
    }
    return `/onboarding?next=${encodeURIComponent(nextParam)}`;
  }

  const updates: Record<string, string> = {};
  if (!isOrientationProfileComplete(profile) && gender_identity && looking_for) {
    updates.gender_identity = gender_identity;
    updates.looking_for = looking_for;
  }
  if (
    profile.username.startsWith("user_") &&
    isValidUsername(username) &&
    username !== profile.username
  ) {
    updates.username = username;
  }

  if (Object.keys(updates).length > 0) {
    await admin.from("profiles").update(updates).eq("id", user.id);
  }

  const merged = { ...profile, ...updates };
  if (!isOrientationProfileComplete(merged)) {
    return `/onboarding?next=${encodeURIComponent(nextParam)}`;
  }

  return appendQuery(nextParam, "confirmed", "1");
}

function appendQuery(path: string, key: string, value: string): string {
  const [base, query] = path.split("?");
  const params = new URLSearchParams(query ?? "");
  params.set(key, value);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}
