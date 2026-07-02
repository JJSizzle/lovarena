import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { assertPartyHost } from "@/lib/party/party-auth";
import { notifyPartyInvite } from "@/lib/notifications/party-invite";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const ip = clientIp(req);
    const rl = await rateLimit(`party-invite:${auth.profile.id}:${ip}`, 20, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const parsed = await parseJsonBody<{ partyId?: string; friendId?: string }>(req);
    if (!parsed.ok) return parsed.response;
    const { partyId, friendId } = parsed.data;
    if (!partyId || !friendId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const hostCheck = await assertPartyHost(partyId, auth.profile.id);
    if ("error" in hostCheck) return hostCheck.error;

    const { room } = hostCheck;
    if (room.status === "ended") {
      return NextResponse.json({ error: "This party has ended." }, { status: 410 });
    }

    const supabase = createAdminClient();

    const { data: member } = await supabase
      .from("party_members")
      .select("profile_id")
      .eq("party_id", partyId)
      .eq("profile_id", friendId)
      .maybeSingle();

    if (member) {
      return NextResponse.json(
        { error: "That friend is already in the party." },
        { status: 400 }
      );
    }

    const { count } = await supabase
      .from("party_members")
      .select("profile_id", { count: "exact", head: true })
      .eq("party_id", partyId);

    if ((count ?? 0) >= room.max_players) {
      return NextResponse.json({ error: "Party is full." }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const inviteUrl = `${origin}/party?code=${room.invite_code}`;

    const result = await notifyPartyInvite({
      hostId: auth.profile.id,
      hostUsername: auth.profile.username,
      friendId,
      inviteCode: room.invite_code,
      inviteUrl,
      gameMode: room.game_mode,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "Invite sent — they'll get a notification with your party link.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invite failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
