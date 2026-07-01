import type { SupabaseClient } from "@supabase/supabase-js";

export async function markPartyRead(
  supabase: SupabaseClient,
  partyId: string,
  profileId: string,
  lastReadAt?: string
): Promise<void> {
  const at = lastReadAt ?? new Date().toISOString();
  await supabase.from("party_read_cursors").upsert(
    {
      party_id: partyId,
      profile_id: profileId,
      last_read_at: at,
    },
    { onConflict: "party_id,profile_id" }
  );
}

export async function getPartyReadCursors(
  supabase: SupabaseClient,
  partyId: string
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("party_read_cursors")
    .select("profile_id, last_read_at")
    .eq("party_id", partyId);

  return new Map(
    (data ?? []).map((row) => [row.profile_id, row.last_read_at as string])
  );
}
