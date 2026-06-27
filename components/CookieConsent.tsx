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
          We use cookies and local storage to sign you in, confirm you are 18+,
          keep the site secure, and remember your choices. We do not load optional
          analytics unless you opt in below. See our{" "}
          <Link href="/privacy" className="text-fuchsia-400 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <label className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
          <input
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Allow optional anonymous analytics (off by default). If enabled, we
            may add privacy-friendly usage metrics in the future; your choice is
            saved on this device.
          </span>
        </label>
        <button
          type="button"
          onClick={accept}
          className="self-end shrink-0 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-semibold px-5 py-2.5 text-sm"
        >
          {analytics ? "Save preferences" : "Accept essential only"}
        </button>
      </div>
    </div>
  );
}
