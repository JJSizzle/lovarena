import { createAdminClient } from "@/lib/supabase/admin";

export async function rateLimit(
  bucketKey: string,
  maxHits: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_bucket_key: bucketKey,
    p_max_hits: maxHits,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("rate_limit_check_failed", bucketKey, error.message);
    return { allowed: false, retryAfterSeconds: windowSeconds };
  }

  if (data === false) {
    return { allowed: false, retryAfterSeconds: windowSeconds };
  }

  return { allowed: true };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}
