import type { SupabaseClient } from "@supabase/supabase-js";
import { REFERRAL_REP_BONUS } from "@/lib/referral/badges";
import { addReputation } from "@/lib/reputation";

const MIN_MESSAGES = 3;
const MIN_DURATION_MS = 2 * 60 * 1000;

export type ReferralRewardResult = {
  rewarded: boolean;
  message: string;
};

export async function processQualifiedChat(
  supabase: SupabaseClient,
  userId: string,
  roomId: string
): Promise<ReferralRewardResult | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "first_chat_completed, referred_by, referral_reward_claimed, reputation_score"
    )
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.first_chat_completed) return null;

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("created_at")
    .eq("id", roomId)
    .maybeSingle();

  if (!room?.created_at) return null;

  const { count: messageCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("sender_id", userId);

  const sent = messageCount ?? 0;
  const durationMs = Date.now() - new Date(room.created_at).getTime();
  const qualified =
    sent >= MIN_MESSAGES || (sent >= 1 && durationMs >= MIN_DURATION_MS);

  if (!qualified) return null;

  const { data: markedComplete } = await supabase
    .from("profiles")
    .update({ first_chat_completed: true })
    .eq("id", userId)
    .eq("first_chat_completed", false)
    .select("referred_by, referral_reward_claimed, reputation_score")
    .maybeSingle();

  if (!markedComplete) return null;

  if (!markedComplete.referred_by || markedComplete.referral_reward_claimed) {
    return null;
  }

  const inviteeRep = addReputation(
    markedComplete.reputation_score ?? 100,
    REFERRAL_REP_BONUS
  );

  const { data: claimedInvitee } = await supabase
    .from("profiles")
    .update({
      referral_reward_claimed: true,
      reputation_score: inviteeRep,
    })
    .eq("id", userId)
    .eq("referral_reward_claimed", false)
    .select("id")
    .maybeSingle();

  if (!claimedInvitee) return null;

  const { data: referrer } = await supabase
    .from("profiles")
    .select("reputation_score, qualified_referrals")
    .eq("id", markedComplete.referred_by)
    .maybeSingle();

  if (referrer) {
    await supabase
      .from("profiles")
      .update({
        qualified_referrals: (referrer.qualified_referrals ?? 0) + 1,
        reputation_score: addReputation(
          referrer.reputation_score ?? 100,
          REFERRAL_REP_BONUS
        ),
      })
      .eq("id", markedComplete.referred_by);
  }

  return {
    rewarded: true,
    message: `You and your friend each earned +${REFERRAL_REP_BONUS} reputation!`,
  };
}
