"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const COOKIE_KEY = "lovarena_cookies_accepted";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(COOKIE_KEY) !== "true") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[90] p-4">
      <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur px-5 py-4 shadow-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <p className="text-sm text-slate-300 leading-relaxed">
          We use essential cookies and local storage for auth, age confirmation,
          and security. See our{" "}
          <Link href="/privacy" className="text-sky-400 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(COOKIE_KEY, "true");
            setVisible(false);
          }}
          className="shrink-0 rounded-xl bg-sky-500 hover:bg-sky-400 text-[#070b14] font-semibold px-5 py-2.5 text-sm"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
