"use client";

import { useEffect, useState } from "react";
import { ParticleBackground } from "@/components/ParticleBackground";
import { getParticleMode, type ParticleMode } from "@/lib/visual-effects";

export function AdaptiveParticleBackground() {
  const [mode, setMode] = useState<ParticleMode>("lite");

  useEffect(() => {
    setMode(getParticleMode());

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 640px)");

    function refresh() {
      setMode(getParticleMode());
    }

    motion.addEventListener("change", refresh);
    narrow.addEventListener("change", refresh);
    return () => {
      motion.removeEventListener("change", refresh);
      narrow.removeEventListener("change", refresh);
    };
  }, []);

  return <ParticleBackground mode={mode} />;
}
