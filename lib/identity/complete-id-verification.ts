import type { SupabaseClient } from "@supabase/supabase-js";
import { REP_ID_VERIFICATION_BONUS } from "@/lib/reputation";
import { syncPartyHostUnlock } from "@/lib/reputation-gating";

export async function completeIdVerification(
  supabase: SupabaseClient,
  userId: string,
  options?: { personaInquiryId?: string }
): Promise<{ repAwarded: number; alreadyVerified: boolean }> {
  const { data: before } = await supabase
    .from("profiles")
    .select("id_verified, reputation_score, party_host_unlocked")
    .eq("id", userId)
    .maybeSingle();

  if (before?.id_verified) {
    return { repAwarded: 0, alreadyVerified: true };
  }

  const { data: awarded, error } = await supabase.rpc("apply_id_verification_bonus", {
    p_user_id: userId,
    p_bonus: REP_ID_VERIFICATION_BONUS,
  });

  if (error) {
    throw new Error(error.message);
  }

  const repAwarded = typeof awarded === "number" ? awarded : 0;

  if (options?.personaInquiryId) {
    await supabase
      .from("profiles")
      .update({ persona_inquiry_id: options.personaInquiryId })
      .eq("id", userId);
  }

  if (repAwarded > 0 && before) {
    const newScore = (before.reputation_score ?? 100) + repAwarded;
    await syncPartyHostUnlock(
      supabase,
      userId,
      newScore,
      before.party_host_unlocked ?? false
    );
  }

  return { repAwarded, alreadyVerified: false };
}
