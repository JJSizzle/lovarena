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

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<MatchMode>("worldwide");
  const [country, setCountry] = useState("US");

  useEffect(() => {
    setCountry(guessCountryCode());
  }, []);

  function handleStart() {
    setMatchPrefs(mode, country);
    router.push("/chat");
  }

  return (
    <main className="min-h-screen flex flex-col bg-[#070b14] text-white overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 40%, #38bdf8 0%, transparent 55%), linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 48px 48px, 48px 48px",
        }}
      />
      <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[360px] h-[360px] rounded-full bg-indigo-600/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/10 text-sky-300 text-sm font-bold">
            L
          </span>
          <span className="text-lg font-semibold tracking-tight">Lovarena</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link
            href={user ? "/chat" : "/login?next=/chat"}
            className="text-sky-400 hover:text-sky-300"
          >
            {user ? "Account" : "Sign in"}
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="max-w-2xl w-full text-center space-y-6">
          <p className="text-sky-400/90 text-sm font-medium tracking-widest uppercase">
            Connect across borders
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
            Welcome to{" "}
            <span className="text-sky-300">Lovarena</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
            Anonymous text chat with real people. Choose your arena — nearby
            neighbors or the whole world.
          </p>
        </div>

        <div className="relative z-10 mt-10 w-full max-w-md space-y-5">
          <p className="text-center text-sm text-slate-500">Matchmaking mode</p>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("regional")}
              className={`rounded-2xl border p-4 text-left transition ${
                mode === "regional"
                  ? "border-sky-400/60 bg-sky-500/15 ring-1 ring-sky-400/40"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <span className="text-xs text-sky-300/80 uppercase tracking-wide">
                Regional
              </span>
              <p className="mt-1 font-semibold text-sm">Regional Matchmaking</p>
              <p className="mt-1 text-xs text-slate-400">
                Match with people in your country
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("worldwide")}
              className={`rounded-2xl border p-4 text-left transition ${
                mode === "worldwide"
                  ? "border-sky-400/60 bg-sky-500/15 ring-1 ring-sky-400/40"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <span className="text-xs text-sky-300/80 uppercase tracking-wide">
                Global
              </span>
              <p className="mt-1 font-semibold text-sm">Worldwide Arena</p>
              <p className="mt-1 text-xs text-slate-400">
                Match with anyone, anywhere
              </p>
            </button>
          </div>

          {mode === "regional" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <label
                htmlFor="country"
                className="block text-sm text-slate-400 mb-2"
              >
                Your country / region
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl bg-[#0c1220] border border-white/10 px-4 py-3 text-sm outline-none focus:border-sky-500/50 text-white"
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
            className="w-full rounded-2xl bg-sky-500 hover:bg-sky-400 text-[#070b14] font-semibold py-4 text-lg transition shadow-lg shadow-sky-500/20"
          >
            Enter Lovarena
          </button>

          <p className="text-center text-xs text-slate-500">
            No sign-up. Be kind. Press Next anytime to skip.
          </p>
          <p className="text-center text-xs text-slate-600">lovarena.app</p>
        </div>
      </div>
    </main>
  );
}
