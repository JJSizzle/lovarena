"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isAgeVerified, setAgeVerified, syncProfileAgeVerified } from "@/lib/age-gate";
import { createClient } from "@/lib/supabase/client";
import { ParticleBackground } from "@/components/ParticleBackground";
import { getSeasonalTheme } from "@/lib/seasonal-theme";
import { useAuth } from "@/components/AuthProvider";

export function AgeGate({ children }: { children: React.ReactNode }) {
  const { refreshProfile } = useAuth();
  const [verified, setVerified] = useState(false);
  const [ready, setReady] = useState(false);
  const seasonal = getSeasonalTheme();

  useEffect(() => {
    setVerified(isAgeVerified());
    setReady(true);
  }, []);

  async function confirmAge() {
    setAgeVerified();
    setVerified(true);

    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await syncProfileAgeVerified();
      await refreshProfile();
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (!verified) {
    return (
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} px-6 overflow-hidden`}
      >
      <ParticleBackground />

      <div className="relative z-10 max-w-md w-full rounded-3xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-8 text-center shadow-[0_0_30px_rgba(168,85,247,0.15)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-fuchsia-400/40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-2xl font-extrabold text-fuchsia-300 shadow-[0_0_20px_rgba(217,70,239,0.2)]">
            18+
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            Age verification
          </h1>
          <p className="mt-3 text-purple-300/70 text-sm leading-relaxed">
            Lovarena is for adults only. You must be{" "}
            <strong className="text-white">18 years or older</strong>.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            By continuing you agree to our{" "}
            <Link href="/terms" className="text-fuchsia-400 hover:text-fuchsia-300 underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-fuchsia-400 hover:text-fuchsia-300 underline">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={confirmAge}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-600 hover:via-fuchsia-600 hover:to-pink-600 text-white font-extrabold py-3.5 shadow-lg shadow-fuchsia-500/25 transition"
            >
              Yes, I am 18 or older
            </button>
            <a
              href="https://www.google.com"
              className="w-full rounded-2xl border border-purple-500/30 bg-slate-900/60 py-3.5 text-sm text-slate-400 hover:text-slate-200 hover:border-fuchsia-500/40 transition"
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
