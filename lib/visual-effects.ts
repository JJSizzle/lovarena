export type ParticleMode = "full" | "lite" | "off";

export function getParticleMode(): ParticleMode {
  if (typeof window === "undefined") return "full";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "off";
  }

  const cores = navigator.hardwareConcurrency ?? 8;
  const narrow = window.matchMedia("(max-width: 640px)").matches;

  if (cores <= 4 || narrow) return "lite";
  return "full";
}
