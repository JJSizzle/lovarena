import webpush from "web-push";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let configured = false;

function ensureConfigured(): boolean {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject =
    process.env.WEB_PUSH_VAPID_SUBJECT ?? "mailto:support@lovarena.app";

  if (!publicKey || !privateKey) return false;

  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }

  return true;
}

export function getWebPushPublicKey(): string | null {
  return process.env.WEB_PUSH_VAPID_PUBLIC_KEY ?? null;
}

export async function sendWebPushToUser(
  supabase: AdminClient,
  userId: string,
  payload: WebPushPayload
): Promise<void> {
  if (!ensureConfigured()) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("web_push_enabled, notifications_enabled")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.web_push_enabled || !profile?.notifications_enabled) {
    return;
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return;

  const body = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body
      );
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
}
