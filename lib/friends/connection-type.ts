export type FriendConnectionType = "mutual_connect" | "request";

export function connectionTypeLabel(
  type: FriendConnectionType | null | undefined
): string | null {
  if (type === "mutual_connect") return "Mutual spark";
  if (type === "request") return "Via request";
  return null;
}
