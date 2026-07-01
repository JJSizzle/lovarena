import { createAdminClient } from "@/lib/supabase/admin";
import { areFriends } from "@/lib/friends/are-friends";
import { rateLimit } from "@/lib/rate-limit";
import { sendWebPushToUser } from "@/lib/notifications/web-push";

export async function notifyPartyInvite(params: {
  hostId: string;
  hostUsername: string;
  friendId: string;
  inviteCode: string;
  inviteUrl: string;
  gameMode: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (params.hostId === params.friendId) {
    return { ok: false, error: "Invalid invite target." };
  }

  const supabase = createAdminClient();

  const friends = await areFriends(params.hostId, params.friendId, supabase);
  if (!friends) {
    return { ok: false, error: "You can only invite friends." };
  }

  const rl = await rateLimit(
    `party-invite:${params.hostId}:${params.friendId}`,
    3,
    3600
  );
  if (!rl.allowed) {
    return { ok: false, error: "Invite already sent recently. Try again later." };
  }

  const modeLabel =
    params.gameMode === "trivia"
      ? "Trivia party"
      : params.gameMode === "hangout"
        ? "Hangout"
        : "Party";

  await sendWebPushToUser(supabase, params.friendId, {
    title: `${params.hostUsername} invited you to a ${modeLabel.toLowerCase()}`,
    body: `Tap to join with code ${params.inviteCode}`,
    url: params.inviteUrl,
    tag: `party-invite-${params.inviteCode}`,
  });

  return { ok: true };
}
