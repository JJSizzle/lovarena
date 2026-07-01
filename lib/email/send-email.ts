import { captureServerError } from "@/lib/capture-error";
import { hasResendApiKey } from "@/lib/email/resend-config";

type SendEmailParams = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
};

function parseResendError(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as { message?: string };
    if (parsed.message) return parsed.message;
  } catch {
    // ignore
  }
  return `Resend request failed (${status})`;
}

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
        ...(params.replyTo ? { reply_to: [params.replyTo] } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const reason = parseResendError(body, res.status);
      await captureServerError(new Error(`Resend failed: ${reason}`), {
        route: "sendEmailViaResend",
        status: res.status,
        body: body.slice(0, 400),
        from: params.from,
        to: params.to,
      });
      return false;
    }

    return true;
  } catch (err) {
    await captureServerError(err, { route: "sendEmailViaResend" });
    return false;
  }
}

export async function sendEmailViaResendDetailed(
  params: SendEmailParams
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!hasResendApiKey()) {
    return { ok: false, reason: "Resend API key is missing." };
  }

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
        ...(params.replyTo ? { reply_to: [params.replyTo] } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const reason = parseResendError(body, res.status);
      await captureServerError(new Error(`Resend failed: ${reason}`), {
        route: "sendEmailViaResendDetailed",
        status: res.status,
        body: body.slice(0, 400),
        from: params.from,
        to: params.to,
      });
      return { ok: false, reason };
    }

    return { ok: true };
  } catch (err) {
    await captureServerError(err, { route: "sendEmailViaResendDetailed" });
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Email send failed.",
    };
  }
}
