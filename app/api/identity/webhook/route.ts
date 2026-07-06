import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractApprovedInquiryUserId,
  verifyPersonaWebhookSignature,
} from "@/lib/identity/persona";
import { completeIdVerification } from "@/lib/identity/complete-id-verification";

/** Persona / dashboard URL checks may use GET; events are POST only. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "lovarena-identity-webhook" });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("persona-signature");

    if (!verifyPersonaWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as unknown;
    const userId = extractApprovedInquiryUserId(payload);
    if (!userId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const supabase = createAdminClient();
    const inner = (payload as { data?: { attributes?: { payload?: { data?: { id?: string } } } } })
      .data?.attributes?.payload?.data;
    const inquiryId = inner?.id;

    const result = await completeIdVerification(supabase, userId, {
      personaInquiryId: inquiryId,
    });

    return NextResponse.json({
      ok: true,
      userId,
      repAwarded: result.repAwarded,
      alreadyVerified: result.alreadyVerified,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
