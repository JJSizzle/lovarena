import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { assertPartyHost } from "@/lib/party/party-auth";
import { buildPartyState, startFirstRound } from "@/lib/party/party-state";
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<{ partyId?: string }>(req);
    if (!parsed.ok) return parsed.response;
    const { partyId } = parsed.data;
    if (!partyId) {
      return NextResponse.json({ error: "Missing partyId" }, { status: 400 });
    }

    const hostCheck = await assertPartyHost(partyId, auth.profile.id);
    if ("error" in hostCheck) return hostCheck.error;

    const { room } = hostCheck;
    if (room.status !== "lobby") {
      return NextResponse.json(
        { error: "Game already started." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { count } = await supabase
      .from("party_members")
      .select("profile_id", { count: "exact", head: true })
      .eq("party_id", partyId);

    if ((count ?? 0) < 2) {
      return NextResponse.json(
        { error: "Need at least 2 friends in the party to start." },
        { status: 400 }
      );
    }

    const updated = await startFirstRound(supabase, room);
    if (!updated) {
      return NextResponse.json({ error: "Could not start game" }, { status: 500 });
    }

    const party = await buildPartyState(
      supabase,
      updated,
      auth.profile.id,
      req.nextUrl.origin
    );

    return NextResponse.json({ party });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Start failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
