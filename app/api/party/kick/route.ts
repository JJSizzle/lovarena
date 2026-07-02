import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { assertPartyHost } from "@/lib/party/party-auth";
import { buildPartyState } from "@/lib/party/party-state";
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<{ partyId?: string; memberId?: string }>(req);
    if (!parsed.ok) return parsed.response;
    const { partyId, memberId } = parsed.data;
    if (!partyId || !memberId) {
      return NextResponse.json(
        { error: "Missing partyId or memberId" },
        { status: 400 }
      );
    }

    if (memberId === auth.profile.id) {
      return NextResponse.json(
        { error: "Use Leave party to exit yourself." },
        { status: 400 }
      );
    }

    const hostCheck = await assertPartyHost(partyId, auth.profile.id);
    if ("error" in hostCheck) return hostCheck.error;

    const supabase = createAdminClient();

    const { data: target } = await supabase
      .from("party_members")
      .select("profile_id")
      .eq("party_id", partyId)
      .eq("profile_id", memberId)
      .maybeSingle();

    if (!target) {
      return NextResponse.json(
        { error: "That player is not in the party." },
        { status: 404 }
      );
    }

    await supabase
      .from("party_members")
      .delete()
      .eq("party_id", partyId)
      .eq("profile_id", memberId);

    const { count } = await supabase
      .from("party_members")
      .select("profile_id", { count: "exact", head: true })
      .eq("party_id", partyId);

    if ((count ?? 0) === 0) {
      await supabase
        .from("party_rooms")
        .update({ status: "ended", updated_at: new Date().toISOString() })
        .eq("id", partyId);
    }

    const { data: room } = await supabase
      .from("party_rooms")
      .select("*")
      .eq("id", partyId)
      .single();

    if (!room || room.status === "ended") {
      return NextResponse.json({ ok: true, party: null });
    }

    const party = await buildPartyState(
      supabase,
      room,
      auth.profile.id,
      req.nextUrl.origin
    );

    return NextResponse.json({ ok: true, party });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kick failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
