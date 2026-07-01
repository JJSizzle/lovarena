import type { SupabaseClient, User } from "@supabase/supabase-js";

export function userHasEmailIdentity(user: User | null): boolean {
  if (!user) return false;
  return user.identities?.some((identity) => identity.provider === "email") ?? false;
}

export async function needsMfaVerification(
  supabase: SupabaseClient
): Promise<boolean> {
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
}

export async function getPrimaryVerifiedTotpFactorId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;

  const verified = (data.totp ?? []).find((factor) => factor.status === "verified");
  return verified?.id ?? null;
}

export async function verifyTotpCode(
  supabase: SupabaseClient,
  factorId: string,
  code: string
): Promise<void> {
  const trimmed = code.replace(/\s/g, "");
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: trimmed,
  });
  if (verifyError) throw verifyError;
}
