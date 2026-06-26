"use client";

import { useEffect, useState } from "react";
import { isAgeVerified, setAgeVerified } from "@/lib/age-gate";

export function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setVerified(isAgeVerified());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b14] px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 40%, #38bdf8 0%, transparent 55%)",
          }}
        />
        <div className="relative z-10 max-w-md w-full rounded-3xl border border-white/10 bg-slate-900/90 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/10 text-2xl font-bold text-sky-300">
            18+
          </div>
          <h1 className="text-2xl font-bold text-white">Age verification</h1>
          <p className="mt-3 text-slate-400 text-sm leading-relaxed">
            Lovarena is for adults only. You must be{" "}
            <strong className="text-white">18 years or older</strong> to use
            video chat, messaging, and social features.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setAgeVerified();
                setVerified(true);
              }}
              className="w-full rounded-2xl bg-sky-500 hover:bg-sky-400 text-[#070b14] font-semibold py-3.5 transition"
            >
              Yes, I am 18 or older
            </button>
            <a
              href="https://www.google.com"
              className="w-full rounded-2xl border border-white/10 py-3.5 text-sm text-slate-400 hover:text-white transition"
            >
              No, leave site
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
