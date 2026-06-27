import { SITE_URL } from "@/lib/site";

/** Production-safe origin for auth emails (never localhost in prod builds). */
export function authSiteOrigin(clientOrigin?: string): string {
  if (clientOrigin && clientOrigin.startsWith("http")) {
    return clientOrigin.replace(/\/$/, "");
  }
  return SITE_URL.replace(/\/$/, "");
}

export function authCallbackUrl(next = "/", clientOrigin?: string): string {
  const origin = authSiteOrigin(clientOrigin);
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Email confirmation / magic links — matches Supabase email template path. */
export function authConfirmUrl(next = "/", clientOrigin?: string): string {
  const origin = authSiteOrigin(clientOrigin);
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}
