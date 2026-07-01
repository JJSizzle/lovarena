import { NextRequest, NextResponse } from "next/server";
import {
  type ContactTopic,
  hasResendApiKey,
  resolveContactFromEmail,
  resolveContactInbox,
} from "@/lib/email/resend-config";
import { sendEmailViaResendDetailed } from "@/lib/email/send-email";
import { captureServerError } from "@/lib/capture-error";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";

const TOPIC_LABELS: Record<ContactTopic, string> = {
  general: "General support",
  safety: "Safety / abuse",
  privacy: "Privacy",
  legal: "Legal / DMCA",
};

function isContactTopic(value: unknown): value is ContactTopic {
  return (
    value === "general" ||
    value === "safety" ||
    value === "privacy" ||
    value === "legal"
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!hasResendApiKey()) {
      return NextResponse.json(
        { error: "Contact form is not configured yet." },
        { status: 503 }
      );
    }

    const ip = clientIp(req);
    const rl = await rateLimit(`contact:${ip}`, 5, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const { topic, email, message, name } = await req.json();

    if (!isContactTopic(topic)) {
      return NextResponse.json({ error: "Invalid topic." }, { status: 400 });
    }

    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedMessage = typeof message === "string" ? message.trim() : "";
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedEmail.includes("@") || trimmedEmail.length > 320) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    if (trimmedMessage.length < 10 || trimmedMessage.length > 4000) {
      return NextResponse.json(
        { error: "Message must be 10–4000 characters." },
        { status: 400 }
      );
    }

    if (trimmedName.length > 120) {
      return NextResponse.json({ error: "Name is too long." }, { status: 400 });
    }

    const inbox = resolveContactInbox(topic);
    if (!inbox) {
      return NextResponse.json(
        { error: "Contact inbox is not configured." },
        { status: 503 }
      );
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lovarena.app";
    const label = TOPIC_LABELS[topic];
    const senderLine = trimmedName
      ? `${trimmedName} <${trimmedEmail}>`
      : trimmedEmail;

    const result = await sendEmailViaResendDetailed({
      from: resolveContactFromEmail(),
      to: [inbox],
      replyTo: trimmedEmail,
      subject: `[Lovarena contact · ${label}]`,
      text: [
        `Contact form · ${label}`,
        `From: ${senderLine}`,
        `Site: ${site}`,
        "",
        trimmedMessage,
      ].join("\n"),
    });

    if (!result.ok) {
      const hint = result.reason.toLowerCase().includes("verify")
        ? " Verify lovarena.app at resend.com/domains and redeploy."
        : "";
      return NextResponse.json(
        {
          error: `Could not send message.${hint} You can email support@lovarena.app instead.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await captureServerError(err, { route: "/api/contact" });
    const message = err instanceof Error ? err.message : "Contact failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
