import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`referral:${auth.profile.id}:${ip}`, 10, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const supabase = createAdminClient();

    const { data: self } = await supabase
      .from("profiles")
      .select("referred_by")
      .eq("id", auth.profile.id)
      .maybeSingle();

    if (self?.referred_by) {
      return NextResponse.json({ ok: true, alreadyApplied: true });
    }

    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", code.trim().toLowerCase())
      .maybeSingle();

    if (!referrer || referrer.id === auth.profile.id) {
      return NextResponse.json({ error: "Referral code not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", auth.profile.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Referral failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
