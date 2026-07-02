import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { assertPartyMember } from "@/lib/party/party-auth";
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

    const membership = await assertPartyMember(partyId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const supabase = createAdminClient();
    const { room, role } = membership;

    await supabase
      .from("party_members")
      .delete()
      .eq("party_id", partyId)
      .eq("profile_id", auth.profile.id);

    if (role === "host") {
      const { data: remaining } = await supabase
        .from("party_members")
        .select("profile_id")
        .eq("party_id", partyId)
        .order("joined_at", { ascending: true })
        .limit(1);

      if (!remaining?.length) {
        await supabase
          .from("party_rooms")
          .update({ status: "ended", updated_at: new Date().toISOString() })
          .eq("id", partyId);
      } else {
        const newHostId = remaining[0].profile_id;
        await supabase
          .from("party_members")
          .update({ role: "host" })
          .eq("party_id", partyId)
          .eq("profile_id", newHostId);

        await supabase
          .from("party_rooms")
          .update({
            host_id: newHostId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", partyId);
      }
    } else if (room.status !== "ended") {
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
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Leave failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
