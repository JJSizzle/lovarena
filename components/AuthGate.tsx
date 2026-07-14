"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AdaptiveParticleBackground } from "@/components/AdaptiveParticleBackground";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

type AuthGateProps = {
  loading: boolean;
  user: User | null;
  loginNext: string;
  requireProfile?: boolean;
  profile?: unknown | null;
  children: React.ReactNode;
};

export function AuthGate({
  loading,
  user,
  loginNext,
  requireProfile = false,
  profile,
  children,
}: AuthGateProps) {
  const router = useRouter();
  const seasonal = getSeasonalTheme();
  const loginHref = `/login?next=${encodeURIComponent(loginNext)}`;

  useEffect(() => {
    if (loading || user) return;
    router.replace(loginHref);
  }, [loading, user, loginHref, router]);

  if (loading) {
    return (
      <div
        className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} text-slate-400`}
      >
        <AdaptiveParticleBackground />
        <span className="relative z-10">Loading…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} text-slate-400 px-6`}
      >
        <AdaptiveParticleBackground />
        <div className="relative z-10 text-center space-y-3">
          <p className="text-sm">Sign in required.</p>
          <Link
            href={loginHref}
            className="text-sm font-semibold text-fuchsia-300 hover:text-fuchsia-200"
          >
            Continue to sign in →
          </Link>
        </div>
      </div>
    );
  }

  if (requireProfile && !profile) {
    return (
      <div
        className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br ${seasonal.gradient} text-slate-400`}
      >
        <AdaptiveParticleBackground />
        <span className="relative z-10">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
}
