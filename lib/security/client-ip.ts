/**
 * Best-effort client IP for rate limits and admin allowlist.
 * Prefer Cloudflare / Vercel headers before raw x-forwarded-for.
 */
export function clientIpFromRequest(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const vercel = req.headers.get("x-vercel-forwarded-for")?.trim();
  if (vercel) return vercel.split(",")[0]?.trim() ?? vercel;

  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";

  return "unknown";
}
