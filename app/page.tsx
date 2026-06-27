"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type MatchMode,
  setMatchPrefs,
} from "@/lib/match-prefs";
import { COUNTRIES, guessCountryCode } from "@/lib/countries";
import { useAuth } from "@/components/AuthProvider";
import { isOrientationProfileComplete } from "@/lib/profile-orientation";

export default function HomePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<MatchMode>("worldwide");
  const [country, setCountry] = useState("US");

  useEffect(() => {
    setCountry(guessCountryCode());
  }, []);

  function handleStart() {
    setMatchPrefs(mode, country);
    if (user && profile && !isOrientationProfileComplete(profile)) {
      router.push("/onboarding?next=/chat");
      return;
    }
    router.push(user ? "/chat" : "/login?next=/chat");
  }

  return (
    <main className="relative min-h-screen flex flex-col bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white overflow-hidden">
      <div className="pointer-events-none absolute top-16 left-1/4 w-[420px] h-[420px] rounded-full bg-pink-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 w-[380px] h-[380px] rounded-full bg-purple-600/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-cyan-500/5 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]">
          LOVARENA
        </h1>
        <Link
          href={user ? "/chat" : "/login?next=/chat"}
          className="bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-purple-300 hover:bg-purple-500/20 transition shadow-[0_0_10px_rgba(168,85,247,0.1)]"
        >
          {user ? "⚡ Enter arena" : "Sign in"}
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="max-w-2xl w-full text-center space-y-6">
          <p className="text-fuchsia-400/90 text-sm font-semibold tracking-widest uppercase">
            Connect across borders
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-slate-100">
            Welcome to the{" "}
            <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              arena
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
            Video + text chat with real people. Pick your match — nearby or
            worldwide.
          </p>
        </div>

        <div className="relative z-10 mt-10 w-full max-w-md space-y-5">
          <p className="text-center text-sm text-purple-300/70 font-medium tracking-wide">
            Matchmaking mode
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMode("regional")}
              className={`rounded-3xl border-2 p-4 text-left transition-all duration-300 ${
                mode === "regional"
                  ? "border-pink-500 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                  : "border-slate-700/80 bg-slate-900/60 hover:border-pink-500/40"
              }`}
            >
              <span className="text-xs text-pink-300 font-bold uppercase tracking-wide">
                Regional
              </span>
              <p className="mt-1 font-semibold text-sm text-slate-100">
                Regional Matchmaking
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Match with people in your country
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("worldwide")}
              className={`rounded-3xl border-2 p-4 text-left transition-all duration-300 ${
                mode === "worldwide"
                  ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  : "border-slate-700/80 bg-slate-900/60 hover:border-cyan-400/40"
              }`}
            >
              <span className="text-xs text-cyan-300 font-bold uppercase tracking-wide">
                Global
              </span>
              <p className="mt-1 font-semibold text-sm text-slate-100">
                Worldwide Arena
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Match with anyone, anywhere
              </p>
            </button>
          </div>

          {mode === "regional" && (
            <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
              <label
                htmlFor="country"
                className="block text-sm text-purple-300/80 mb-2 font-medium"
              >
                Your country / region
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50 text-white"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleStart}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-slate-950 font-extrabold py-4 text-lg transition transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-400/30"
          >
            Enter Lovarena
          </button>

          <p className="text-center text-xs text-slate-500">
            Sign in required. By entering you agree to our{" "}
            <Link href="/terms" className="text-fuchsia-400 underline hover:text-fuchsia-300">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-fuchsia-400 underline hover:text-fuchsia-300">
              Privacy Policy
            </Link>
            .
          </p>
          <p className="text-center text-xs text-slate-600">lovarena.app</p>
        </div>
      </div>
    </main>
  );
}
