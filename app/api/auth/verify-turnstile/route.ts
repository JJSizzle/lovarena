import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    const result = await verifyTurnstileToken(token, clientIp(req));

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Captcha check failed." }, { status: 400 });
  }
}
