import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function getReadCursor(
  supabase: AdminClient,
  userId: string,
  peerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("dm_read_cursors")
    .select("last_read_at")
    .eq("user_id", userId)
    .eq("peer_id", peerId)
    .maybeSingle();

  return data?.last_read_at ?? null;
}

export async function isDmUnreadServer(
  supabase: AdminClient,
  userId: string,
  senderId: string,
  createdAt: string
): Promise<boolean> {
  const lastRead = await getReadCursor(supabase, userId, senderId);
  if (!lastRead) return true;
  return createdAt > lastRead;
}

export async function markConversationRead(
  supabase: AdminClient,
  userId: string,
  peerId: string,
  lastReadAt: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("read_receipts_enabled")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.read_receipts_enabled === false) {
    return false;
  }

  const existing = await getReadCursor(supabase, userId, peerId);
  if (existing && lastReadAt <= existing) {
    return true;
  }

  const { error } = await supabase.from("dm_read_cursors").upsert(
    {
      user_id: userId,
      peer_id: peerId,
      last_read_at: lastReadAt,
    },
    { onConflict: "user_id,peer_id" }
  );

  return !error;
}

/** When peerId read messages from userId (for read receipts on sent messages). */
export async function getPeerReadReceiptAt(
  supabase: AdminClient,
  peerId: string,
  userId: string
): Promise<string | null> {
  const { data: peerProfile } = await supabase
    .from("profiles")
    .select("read_receipts_enabled")
    .eq("id", peerId)
    .maybeSingle();

  if (peerProfile?.read_receipts_enabled === false) {
    return null;
  }

  return getReadCursor(supabase, peerId, userId);
}
