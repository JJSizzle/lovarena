import type { SupabaseClient } from "@supabase/supabase-js";
import {
  REP_THUMBS_DOWN,
  REP_THUMBS_UP,
  addReputation,
  subtractReputation,
} from "@/lib/reputation";

async function subtractPartnerReputation(
  supabase: SupabaseClient,
  partnerId: string,
  amount: number
): Promise<void> {
  const { error } = await supabase.rpc("subtract_reputation", {
    p_user_id: partnerId,
    p_amount: amount,
  });

  if (error) {
    const { data: partnerRow } = await supabase
      .from("profiles")
      .select("reputation_score")
      .eq("id", partnerId)
      .maybeSingle();
    await supabase
      .from("profiles")
      .update({
        reputation_score: subtractReputation(
          partnerRow?.reputation_score ?? 100,
          amount
        ),
      })
      .eq("id", partnerId);
  }
}

async function addPartnerReputation(
  supabase: SupabaseClient,
  partnerId: string,
  amount: number
): Promise<void> {
  const { data: partnerRow } = await supabase
    .from("profiles")
    .select("reputation_score")
    .eq("id", partnerId)
    .maybeSingle();

  await supabase
    .from("profiles")
    .update({
      reputation_score: addReputation(
        partnerRow?.reputation_score ?? 100,
        amount
      ),
    })
    .eq("id", partnerId);
}

async function revertPositiveRating(
  supabase: SupabaseClient,
  partnerId: string
): Promise<void> {
  const { data: partnerRow } = await supabase
    .from("profiles")
    .select("reputation_score, positive_ratings")
    .eq("id", partnerId)
    .maybeSingle();

  if (!partnerRow) return;

  await supabase
    .from("profiles")
    .update({
      positive_ratings: Math.max(0, (partnerRow.positive_ratings ?? 0) - 1),
      reputation_score: subtractReputation(
        partnerRow.reputation_score ?? 100,
        REP_THUMBS_UP
      ),
    })
    .eq("id", partnerId);
}

/** Apply reputation when feedback rating is new or changed (reverts prior effect first). */
export async function applyFeedbackReputationChange(
  supabase: SupabaseClient,
  partnerId: string,
  previousRating: "up" | "down" | null,
  newRating: "up" | "down"
): Promise<void> {
  if (previousRating === newRating) return;

  if (previousRating === "up") {
    await revertPositiveRating(supabase, partnerId);
  } else if (previousRating === "down") {
    await addPartnerReputation(supabase, partnerId, REP_THUMBS_DOWN);
  }

  if (newRating === "up") {
    await supabase.rpc("apply_positive_rating", { p_partner_id: partnerId });
  } else {
    await subtractPartnerReputation(supabase, partnerId, REP_THUMBS_DOWN);
  }
}
