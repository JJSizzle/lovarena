import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { assertPartyMember } from "@/lib/party/party-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

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

    return NextResponse.json({
      messages: (rows ?? []).map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        username: nameById.get(row.sender_id) ?? "Player",
        content: row.content,
        createdAt: row.created_at,
        isYou: row.sender_id === auth.profile.id,
      })),
    });
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
    const rl = await rateLimit(`party-msg:${auth.profile.id}:${ip}`, 60, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

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
