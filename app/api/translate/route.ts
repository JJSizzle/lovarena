import { NextRequest, NextResponse } from "next/server";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { sanitizePrimaryLanguage } from "@/lib/translation/language-codes";
import { translateText } from "@/lib/translation/translate-text";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const ip = clientIp(req);
    const rl = await rateLimit(`translate:${auth.profile.id}:${ip}`, 80, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const { text, targetLanguage } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const target = sanitizePrimaryLanguage(targetLanguage ?? "English");

    const result = await translateText(text, target);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Translation unavailable";
    const status = message.includes("not configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
