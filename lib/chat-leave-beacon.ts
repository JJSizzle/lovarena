/** Notify server the user left chat (works during tab close via sendBeacon). */
export function beaconLeaveChat(roomId: string | null | undefined) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({ roomId: roomId ?? null });
  const blob = new Blob([body], { type: "application/json" });

  if (navigator.sendBeacon?.("/api/leave", blob)) return;

  void fetch("/api/leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}
