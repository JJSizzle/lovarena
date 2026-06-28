import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertRoomMember,
  getPartnerId,
  requireAuthProfile,
} from "@/lib/auth/api-auth";
import { endActiveRoomsForUser } from "@/lib/moderation/ban-user";
import {
  isUserFlaggedForAbuse,
} from "@/lib/moderation/enforce-violation";
import { notifyModerators } from "@/lib/moderation/notify-admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const VALID_REASONS = [
  "harassment",
  "hate_speech",
  "nudity",
  "spam",
  "underage",
  "other",
] as const;

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

    const { roomId, reason, details } = await req.json();

    if (!roomId || !reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid report" }, { status: 400 });
    }

    const membership = await assertRoomMember(roomId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const reportedUserId = getPartnerId(membership.room, auth.profile.id);
    if (!reportedUserId) {
      return NextResponse.json({ error: "No user to report" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("abuse_reports").insert({
      reporter_id: auth.profile.id,
      reported_user_id: reportedUserId,
      room_id: roomId,
      reason,
      details: details?.trim()?.slice(0, 500) ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("reputation_score")
      .eq("id", reportedUserId)
      .maybeSingle();

    if (profileRow) {
      await supabase
        .from("profiles")
        .update({
          reputation_score: Math.max(0, (profileRow.reputation_score ?? 100) - 10),
        })
        .eq("id", reportedUserId);
    }

    await supabase.rpc("auto_flag_on_reports", {
      p_user_id: reportedUserId,
      p_threshold: 3,
    });

    if (await isUserFlaggedForAbuse(supabase, reportedUserId)) {
      await endActiveRoomsForUser(supabase, reportedUserId);
      void notifyModerators({
        type: "auto_flag",
        reason: "auto_flag_on_reports (3+ reports in 24h)",
        reportedUserId,
        reporterId: auth.profile.id,
        roomId,
        details: details?.trim()?.slice(0, 500) ?? null,
      });
    } else {
      void notifyModerators({
        type: "report",
        reason,
        reportedUserId,
        reporterId: auth.profile.id,
        roomId,
        details: details?.trim()?.slice(0, 500) ?? null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Report failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
