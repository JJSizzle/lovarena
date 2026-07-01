import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { assertPartyMember } from "@/lib/party/party-auth";
import { getPartyReadCursors, markPartyRead } from "@/lib/party/read-cursors";
import { moderateMessageContent } from "@/lib/moderation/moderate-message";
import { applyTimedRestriction } from "@/lib/moderation/user-restriction";
import { getRestrictionApiPayload } from "@/lib/moderation/enforce-violation";
import {
  applyTieredRateLimit,
  PARTY_MESSAGE_RATE_TIERS,
} from "@/lib/rate-limit-tiers";
import { clientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const partyId = req.nextUrl.searchParams.get("partyId");
    if (!partyId) {
      return NextResponse.json({ error: "Missing partyId" }, { status: 400 });
    }

    const membership = await assertPartyMember(partyId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const supabase = createAdminClient();
    const { data: rows, error } = await supabase
      .from("party_messages")
      .select("id, sender_id, content, created_at")
      .eq("party_id", partyId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const senderIds = [...new Set((rows ?? []).map((r) => r.sender_id))];
    const { data: profiles } = senderIds.length
      ? await supabase
          .from("profiles")
          .select("id, username")
          .in("id", senderIds)
      : { data: [] };

    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.username]));

    const { data: memberRows } = await supabase
      .from("party_members")
      .select("profile_id")
      .eq("party_id", partyId);

    const memberIds = (memberRows ?? []).map((m) => m.profile_id);
    const otherMemberIds = memberIds.filter((id) => id !== auth.profile.id);

    let readCursors = new Map<string, string>();
    try {
      readCursors = await getPartyReadCursors(supabase, partyId);
    } catch {
      // table may not exist until migration runs
    }

    const messages = (rows ?? []).map((row) => {
      const isYou = row.sender_id === auth.profile.id;
      let seenByAll = false;
      if (isYou && otherMemberIds.length > 0) {
        seenByAll = otherMemberIds.every((memberId) => {
          const cursor = readCursors.get(memberId);
          return cursor
            ? new Date(cursor).getTime() >= new Date(row.created_at).getTime()
            : false;
        });
      }

      return {
        id: row.id,
        senderId: row.sender_id,
        username: nameById.get(row.sender_id) ?? "Player",
        content: row.content,
        createdAt: row.created_at,
        isYou,
        seenByAll,
      };
    });

    const latest = rows?.[rows.length - 1];
    if (latest) {
      void markPartyRead(supabase, partyId, auth.profile.id, latest.created_at);
    }

    return NextResponse.json({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Messages load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const ip = clientIp(req);
    const rl = await applyTieredRateLimit(
      "party-msg",
      auth.profile.id,
      ip,
      auth.profile.created_at,
      PARTY_MESSAGE_RATE_TIERS
    );
    if (!rl.allowed) return rl.response;

    const { partyId, content } = await req.json();
    if (!partyId) {
      return NextResponse.json({ error: "Missing partyId" }, { status: 400 });
    }

    const text = String(content ?? "").trim();
    if (!text || text.length > 500) {
      return NextResponse.json(
        { error: "Message must be 1–500 characters." },
        { status: 400 }
      );
    }

    const membership = await assertPartyMember(partyId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const supabase = createAdminClient();

    const restriction = await getRestrictionApiPayload(supabase, auth.profile.id);
    if (restriction) {
      return NextResponse.json({ ...restriction, violation: true }, { status: 403 });
    }

    const moderation = moderateMessageContent(text);
    if (!moderation.allowed) {
      if (moderation.kind === "severe") {
        await applyTimedRestriction(
          supabase,
          auth.profile.id,
          "severe_hate_speech_or_slur"
        );
        return NextResponse.json(
          { error: moderation.userMessage, violation: true },
          { status: 403 }
        );
      }

      return NextResponse.json({ error: moderation.userMessage }, { status: 400 });
    }

    const { data: inserted, error } = await supabase
      .from("party_messages")
      .insert({
        party_id: partyId,
        sender_id: auth.profile.id,
        content: text,
      })
      .select("id, sender_id, content, created_at")
      .single();

    if (error || !inserted) {
      return NextResponse.json(
        { error: error?.message ?? "Send failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: {
        id: inserted.id,
        senderId: inserted.sender_id,
        username: auth.profile.username,
        content: inserted.content,
        createdAt: inserted.created_at,
        isYou: true,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
