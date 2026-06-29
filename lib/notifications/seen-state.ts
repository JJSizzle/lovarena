const READ_SENDERS_KEY = "lovarena_notif_read_senders";
const RECENT_WINDOW_MS = 86_400_000;

function readSenders(): Record<string, string> {
  try {
    const raw = localStorage.getItem(READ_SENDERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSenders(map: Record<string, string>) {
  try {
    localStorage.setItem(READ_SENDERS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function isDmUnread(senderId: string, createdAt: string): boolean {
  const senderReadAt = readSenders()[senderId];
  if (senderReadAt) return createdAt > senderReadAt;

  const createdMs = new Date(createdAt).getTime();
  return createdMs > Date.now() - RECENT_WINDOW_MS;
}

export function markSenderRead(senderId: string, at?: string): void {
  const map = readSenders();
  const nextAt = at ?? new Date().toISOString();
  const prevAt = map[senderId];
  if (prevAt && nextAt <= prevAt) return;
  map[senderId] = nextAt;
  writeSenders(map);
  window.dispatchEvent(new Event("lovarena:notifications-seen"));
}
