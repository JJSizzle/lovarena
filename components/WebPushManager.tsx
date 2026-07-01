"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function subscribeToWebPush(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, error: "Push is not supported in this browser." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Notification permission was denied." };
  }

  const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
  const keyData = await keyRes.json();
  if (!keyRes.ok || !keyData.enabled || !keyData.publicKey) {
    return {
      ok: false,
      error:
        "Browser notifications aren't available right now. Try again later or use email alerts in Settings.",
    };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    });
  }

  const json = subscription.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Could not save subscription." };
  }

  return { ok: true };
}

export async function unsubscribeFromWebPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  const endpoint = subscription?.endpoint;

  if (subscription) {
    await subscription.unsubscribe();
  }

  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}

/** Registers the service worker when logged in (subscription happens from Settings). */
export function WebPushManager() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || !profile?.web_push_enabled) return;
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, [user, profile?.web_push_enabled]);

  return null;
}
