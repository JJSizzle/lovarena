import { captureServerError } from "@/lib/capture-error";
import { hasResendApiKey } from "@/lib/email/resend-config";

type SendEmailParams = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
};

export async function sendEmailViaResend(
  params: SendEmailParams
): Promise<boolean> {
  if (!hasResendApiKey()) return false;

  const resendKey = process.env.RESEND_API_KEY!.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        reply_to: params.replyTo,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      await captureServerError(new Error(`Resend failed: ${res.status}`), {
        route: "sendEmailViaResend",
        body: body.slice(0, 200),
      });
      return false;
    }

    return true;
  } catch (err) {
    await captureServerError(err, { route: "sendEmailViaResend" });
    return false;
  }
}
