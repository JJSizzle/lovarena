"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ParticleBackground } from "@/components/ParticleBackground";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

function AdminBlockedContent() {
  const searchParams = useSearchParams();
  const ip = searchParams.get("ip");

  return (
    <div className="relative z-10 text-center max-w-md rounded-2xl border border-amber-500/30 bg-slate-950/80 backdrop-blur-xl p-8">
      <h1 className="text-xl font-bold text-amber-200">Admin blocked on this network</h1>
      <p className="text-slate-400 mt-3 text-sm leading-relaxed">
        <code className="text-sky-400">ADMIN_ALLOWED_IPS</code> is set on production.
        Your current IP is not on the allowlist.
      </p>
      {ip && ip !== "unknown" && (
        <p className="mt-4 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm">
          IP this site sees:{" "}
          <code className="font-mono text-emerald-300">{ip}</code>
        </p>
      )}
      <p className="text-xs text-slate-500 mt-4 leading-relaxed">
        Add the IP above to Vercel →{" "}
        <code className="text-slate-400">ADMIN_ALLOWED_IPS</code> (comma-separated).
        It may differ from what Google or ipify shows if you use Cloudflare.
        Or check{" "}
        <a href="/api/network/ip" className="text-sky-400 underline">
          /api/network/ip
        </a>{" "}
        in this browser, then redeploy.
      </p>
      <Link
        href="/"
        className="inline-block text-sky-400 text-sm mt-6 hover:text-sky-300"
      >
        ← Home
      </Link>
    </div>
  );
}

export default function AdminBlockedPage() {
  const seasonal = getSeasonalTheme();

  return (
    <main
      className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} text-white px-6`}
    >
      <ParticleBackground />
      <Suspense fallback={<span className="relative z-10 text-slate-400">Loading…</span>}>
        <AdminBlockedContent />
      </Suspense>
    </main>
  );
}
