import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  getPartnerId,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import { maybeAutoRestrictFromReports } from "@/lib/moderation/auto-flag-reports";
import { getRestrictionApiPayload } from "@/lib/moderation/enforce-violation";
import { areFriends } from "@/lib/party/party-auth";
import {
  applyReportReputationPenalty,
  validateReportDetails,
  verifyRecentMatch,
} from "@/lib/moderation/report-reputation";
import { isReportReason, reportReasonLabel } from "@/lib/moderation/report-reasons";
import { notifyModerators } from "@/lib/moderation/notify-admin";
import { captureServerError } from "@/lib/capture-error";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const ip = clientIp(req);
    const rl = await rateLimit(`report:${auth.profile.id}:${ip}`, 10, 3600);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many reports. Try again later." },
        { status: 429 }
      );
    }

    const { roomId, reportedUserId: reportedUserIdInput, reason, details } =
      await req.json();

    if (!reason || !isReportReason(reason)) {
      return NextResponse.json({ error: "Invalid report" }, { status: 400 });
    }

    const trimmedDetails = details?.trim()?.slice(0, 500) ?? null;
    const detailsError = validateReportDetails(reason, trimmedDetails);
    if (detailsError) {
      return NextResponse.json({ error: detailsError }, { status: 400 });
    }

    let reportedUserId: string | null = null;
    let reportRoomId: string | null = roomId ?? null;

    if (roomId) {
      const membership = await assertRoomMember(roomId, auth.profile.id);
      if ("error" in membership) return membership.error;

      reportedUserId = getPartnerId(membership.room, auth.profile.id);
      if (!reportedUserId) {
        return NextResponse.json({ error: "No user to report" }, { status: 400 });
      }
    } else if (reportedUserIdInput) {
      if (reportedUserIdInput === auth.profile.id) {
        return NextResponse.json({ error: "Invalid report" }, { status: 400 });
      }
      reportedUserId = reportedUserIdInput;
      reportRoomId = null;
    } else {
      return NextResponse.json({ error: "Invalid report" }, { status: 400 });
    }

    if (!reportedUserId) {
      return NextResponse.json({ error: "No user to report" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (!roomId) {
      const matched = await verifyRecentMatch(
        supabase,
        auth.profile.id,
        reportedUserId
      );
      const friends = await areFriends(auth.profile.id, reportedUserId);
      if (!matched && !friends) {
        return NextResponse.json(
          {
            error:
              "You can only report someone from your friends or recent match history.",
          },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase.from("abuse_reports").insert({
      reporter_id: auth.profile.id,
      reported_user_id: reportedUserId,
      room_id: reportRoomId,
      reason,
      details: trimmedDetails,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const repResult = await applyReportReputationPenalty(
      supabase,
      auth.profile.id,
      reportedUserId
    );

    const autoFlag = await maybeAutoRestrictFromReports(
      supabase,
      reportedUserId
    );

    if (autoFlag.restricted) {
      void notifyModerators({
        type: "auto_flag",
        reason:
          autoFlag.result?.type === "ban"
            ? "second_strike_within_30d (reports)"
            : "3+ unique reporters in 24h (24h restrict)",
        reportedUserId,
        reporterId: auth.profile.id,
        roomId: reportRoomId,
        details: trimmedDetails,
      });
    } else {
      void notifyModerators({
        type: "report",
        reason: reportReasonLabel(reason),
        reportedUserId,
        reporterId: auth.profile.id,
        roomId: reportRoomId,
        details: trimmedDetails,
      });
    }

    return NextResponse.json({
      ok: true,
      repPenaltyApplied: repResult.applied,
      message: repResult.applied
        ? "Report submitted. Thank you."
        : (repResult.skipReason ??
          "Report submitted for moderator review."),
    });
  } catch (err) {
    await captureServerError(err, { route: "/api/report" });
    const message = err instanceof Error ? err.message : "Report failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
