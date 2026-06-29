/** Stable Supabase broadcast channel id for a private DM pair. */
export function dmTypingChannelId(userA: string, userB: string): string {
  const [a, b] = [userA, userB].sort();
  return `dm-typing:${a}:${b}`;
}
