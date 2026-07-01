import { COOKIE_KEY } from "@/lib/referral";

export const BOTTOM_CHROME_EVENT = "lovarena:bottom-chrome-changed";

export function isCookieBannerVisible(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(COOKIE_KEY) !== "true";
}

export function notifyBottomChromeChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BOTTOM_CHROME_EVENT));
}
