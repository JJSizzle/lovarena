import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import {
  getUserRestriction,
} from "@/lib/moderation/user-restriction";
import { formatRestrictionMessage } from "@/lib/moderation/restriction-constants";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const supabase = createAdminClient();
    const restriction = await getUserRestriction(supabase, auth.profile.id);

    const appealRl = await rateLimit(
      `restriction-appeal:${auth.profile.id}`,
      1,
      86_400
    );

    return NextResponse.json({
      active: restriction.active,
      isPermanentBan: restriction.isPermanentBan,
      restrictedUntil: restriction.restrictedUntil,
      reviewStatus: restriction.reviewStatus,
      message: restriction.active
        ? formatRestrictionMessage(restriction)
        : null,
      canAppeal:
        restriction.active &&
        !restriction.isPermanentBan &&
        appealRl.allowed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
