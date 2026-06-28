export function estimateMatchWaitSeconds(
  online: number | null,
  inQueue: number | null
): number | null {
  if (online == null || inQueue == null) return null;
  if (inQueue <= 0) return 15;
  if (online <= 0) return 90;

  const ratio = inQueue / online;
  const base = ratio <= 0.5 ? 20 : ratio <= 1 ? 35 : ratio <= 2 ? 55 : 90;
  return Math.min(120, Math.max(15, Math.round(base + inQueue * 8)));
}

export function formatWaitEstimate(seconds: number | null): string {
  if (seconds == null) return "Estimating wait…";
  if (seconds < 45) return "Usually under a minute";
  if (seconds < 75) return "About 1 minute";
  return "About 1–2 minutes";
}
