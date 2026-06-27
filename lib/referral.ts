export const REFERRAL_STORAGE_KEY = "lovarena_referral_code";
export const TOUR_STORAGE_KEY = "lovarena_tour_done";
export const ANALYTICS_CONSENT_KEY = "lovarena_analytics_consent";
export const COOKIE_KEY = "lovarena_cookies_accepted";

export function siteOrigin(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://lovarena.app";
}

export function referralLink(code: string): string {
  return `${siteOrigin()}/login?ref=${encodeURIComponent(code)}`;
}
