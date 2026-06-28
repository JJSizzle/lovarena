import type { SupabaseClient } from "@supabase/supabase-js";
import { endActiveRoomsForUser } from "@/lib/moderation/ban-user";
import {
  RESTRICT_DURATION_MS,
  STRIKE_WINDOW_MS,
  type RestrictionApiPayload,
  type ReviewStatus,
  type UserRestriction,
  formatRestrictionMessage,
} from "@/lib/moderation/restriction-constants";

type FlaggedRow = {
  user_id: string;
  flagged_for_abuse: boolean;
  is_permanent_ban: boolean;
  restricted_until: string | null;
  reason: string;
  review_status: ReviewStatus | null;
};

export async function logModerationStrike(
  supabase: SupabaseClient,
  userId: string,
  action: "restrict_24h" | "ban" | "early_unrestrict" | "auto_lift" | "admin_unflag",
  reason: string
): Promise<void> {
  await supabase.from("moderation_strikes").insert({
    user_id: userId,
    action,
    reason: reason.slice(0, 200),
  });
}

export async function countRestrictStrikesIn30Days(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const since = new Date(Date.now() - STRIKE_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("moderation_strikes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "restrict_24h")
    .gte("created_at", since);

  return count ?? 0;
}

function rowToRestriction(row: FlaggedRow | null): UserRestriction {
  if (!row?.flagged_for_abuse) {
    return {
      active: false,
      isPermanentBan: false,
      restrictedUntil: null,
      reason: null,
      reviewStatus: null,
    };
  }

  if (row.is_permanent_ban) {
    return {
      active: true,
      isPermanentBan: true,
      restrictedUntil: null,
      reason: row.reason,
      reviewStatus: row.review_status,
    };
  }

  if (row.restricted_until) {
    const untilMs = new Date(row.restricted_until).getTime();
    if (untilMs <= Date.now()) {
      return {
        active: false,
        isPermanentBan: false,
        restrictedUntil: row.restricted_until,
        reason: row.reason,
        reviewStatus: row.review_status,
      };
    }

    return {
      active: true,
      isPermanentBan: false,
      restrictedUntil: row.restricted_until,
      reason: row.reason,
      reviewStatus: row.review_status,
    };
  }

  return {
    active: false,
    isPermanentBan: false,
    restrictedUntil: null,
    reason: row.reason,
    reviewStatus: row.review_status,
  };
}

async function fetchFlaggedRow(
  supabase: SupabaseClient,
  userId: string
): Promise<FlaggedRow | null> {
  const { data } = await supabase
    .from("flagged_users")
    .select(
      "user_id, flagged_for_abuse, is_permanent_ban, restricted_until, reason, review_status"
    )
    .eq("user_id", userId)
    .maybeSingle();

  return (data as FlaggedRow | null) ?? null;
}

export async function liftRestriction(
  supabase: SupabaseClient,
  userId: string,
  reviewStatus: ReviewStatus,
  strikeAction?: "early_unrestrict" | "auto_lift" | "admin_unflag"
): Promise<void> {
  await supabase
    .from("flagged_users")
    .update({
      flagged_for_abuse: false,
      restricted_until: null,
      review_status: reviewStatus,
      auto_reviewed_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (strikeAction) {
    await logModerationStrike(
      supabase,
      userId,
      strikeAction,
      `review_status:${reviewStatus}`
    );
  }
}

export async function expireElapsedRestrictions(
  supabase: SupabaseClient
): Promise<number> {
  const now = new Date().toISOString();
  const { data: expired } = await supabase
    .from("flagged_users")
    .select("user_id")
    .eq("flagged_for_abuse", true)
    .eq("is_permanent_ban", false)
    .not("restricted_until", "is", null)
    .lte("restricted_until", now);

  for (const row of expired ?? []) {
    await liftRestriction(supabase, row.user_id, "expired", "auto_lift");
  }

  return expired?.length ?? 0;
}

export async function getUserRestriction(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRestriction> {
  const row = await fetchFlaggedRow(supabase, userId);
  const restriction = rowToRestriction(row);

  if (
    row?.flagged_for_abuse &&
    !row.is_permanent_ban &&
    row.restricted_until &&
    new Date(row.restricted_until).getTime() <= Date.now()
  ) {
    await liftRestriction(supabase, userId, "expired", "auto_lift");
    return {
      active: false,
      isPermanentBan: false,
      restrictedUntil: null,
      reason: row.reason,
      reviewStatus: "expired",
    };
  }

  return restriction;
}

export async function isUserFlaggedForAbuse(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const restriction = await getUserRestriction(supabase, userId);
  return restriction.active;
}

export async function getRestrictionApiPayload(
  supabase: SupabaseClient,
  userId: string
): Promise<RestrictionApiPayload | null> {
  const restriction = await getUserRestriction(supabase, userId);
  if (!restriction.active) return null;

  return {
    flagged: true,
    isPermanentBan: restriction.isPermanentBan,
    restrictedUntil: restriction.restrictedUntil,
    error: formatRestrictionMessage(restriction),
  };
}

export type TimedRestrictionResult =
  | { type: "restrict_24h"; restrictedUntil: string }
  | { type: "ban" };

export async function applyTimedRestriction(
  supabase: SupabaseClient,
  userId: string,
  reason: string,
  sourceRoomId?: string | null
): Promise<TimedRestrictionResult> {
  const priorStrikes = await countRestrictStrikesIn30Days(supabase, userId);

  if (priorStrikes >= 1) {
    const { banUserFromPlatform } = await import("@/lib/moderation/ban-user");
    await banUserFromPlatform(
      supabase,
      userId,
      `second_strike_within_30d: ${reason}`,
      sourceRoomId
    );
    return { type: "ban" };
  }

  const restrictedUntil = new Date(
    Date.now() + RESTRICT_DURATION_MS
  ).toISOString();

  await supabase.from("flagged_users").upsert(
    {
      user_id: userId,
      flagged_for_abuse: true,
      is_permanent_ban: false,
      restricted_until: restrictedUntil,
      review_status: "pending",
      auto_reviewed_at: null,
      reason: reason.slice(0, 200),
      source_room_id: sourceRoomId ?? null,
      flagged_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  await logModerationStrike(supabase, userId, "restrict_24h", reason);
  await endActiveRoomsForUser(supabase, userId);

  return { type: "restrict_24h", restrictedUntil };
}
