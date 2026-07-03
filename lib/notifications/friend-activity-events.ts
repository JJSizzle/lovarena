export type FriendActivityDetail = {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  connection_type?: string | null;
  eventType: "INSERT" | "UPDATE";
};

export const FRIEND_ACTIVITY_EVENT = "lovarena:friend-activity";

export function dispatchFriendActivity(detail: FriendActivityDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<FriendActivityDetail>(FRIEND_ACTIVITY_EVENT, { detail })
  );
}
