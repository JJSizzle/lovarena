"use client";

import Link from "next/link";
import { ParticleBackground } from "@/components/ParticleBackground";
import { BrandMark } from "@/components/BrandMark";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

export function AuthPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const seasonal = getSeasonalTheme();

  return (
    <main
      className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} px-6 py-10 text-white overflow-hidden`}
    >
      <ParticleBackground />
      <div className="pointer-events-none absolute top-16 left-1/4 w-[320px] h-[320px] rounded-full bg-pink-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 w-[280px] h-[280px] rounded-full bg-purple-600/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-xl p-8 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
        <Link
          href="/"
          className="text-sm text-fuchsia-400 hover:text-fuchsia-300 transition"
        >
          ← <BrandMark />
        </Link>
        <h1 className="mt-4 text-2xl font-bold bg-gradient-to-r from-pink-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="mt-2 text-sm text-purple-300/70">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}

export const authInputClass =
  "w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500/50 placeholder:text-slate-500";

export const authButtonClass =
  "w-full rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-600 hover:via-fuchsia-600 hover:to-pink-600 text-white font-extrabold py-3 disabled:opacity-50 shadow-lg shadow-fuchsia-500/25 transition";
