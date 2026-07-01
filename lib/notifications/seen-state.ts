/** Marks a friend DM thread read (server-side cursor + local refresh event). */
export function markSenderRead(senderId: string, at?: string): void {
  const nextAt = at ?? new Date().toISOString();

  void fetch("/api/private-messages/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendId: senderId, lastReadAt: nextAt }),
  })
    .catch(() => {})
    .finally(() => {
      window.dispatchEvent(new Event("lovarena:notifications-seen"));
    });
}
