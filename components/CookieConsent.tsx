"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ANALYTICS_CONSENT_KEY,
  COOKIE_KEY,
} from "@/lib/referral";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(COOKIE_KEY) !== "true") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function accept() {
    localStorage.setItem(COOKIE_KEY, "true");
    localStorage.setItem(
      ANALYTICS_CONSENT_KEY,
      analytics ? "granted" : "denied"
    );
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-[90] p-4">
      <div className="max-w-3xl mx-auto rounded-2xl border border-purple-500/30 bg-slate-950/95 backdrop-blur px-5 py-4 shadow-xl flex flex-col gap-4">
        <p className="text-sm text-slate-300 leading-relaxed">
          We use essential cookies and local storage for auth, age confirmation,
          and security. Optional analytics help us improve Lovarena. See our{" "}
          <Link href="/privacy" className="text-fuchsia-400 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
          />
          Allow anonymous usage analytics (optional)
        </label>
        <button
          type="button"
          onClick={accept}
          className="self-end shrink-0 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-semibold px-5 py-2.5 text-sm"
        >
          Save preferences
        </button>
      </div>
    </div>
  );
}
