"use client";

import { ParticleBackground } from "@/components/ParticleBackground";
import { getSeasonalTheme } from "@/lib/seasonal-theme";

export function ArenaPageLayout({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const seasonal = getSeasonalTheme();

  return (
    <main
      className={`relative min-h-screen bg-gradient-to-br ${seasonal.gradient} text-white overflow-hidden ${className}`}
    >
      <ParticleBackground />
      <div className="relative z-10">{children}</div>
    </main>
  );
}
