import { NextResponse } from "next/server";
import {
  hasAdminAlertEmail,
  hasCronSecret,
  hasResendApiKey,
  hasSentryDsn,
  hasSlackModerationWebhook,
  isContactFormConfigured,
  isModerationAlertsConfigured,
} from "@/lib/email/resend-config";
import { isWebPushConfigured } from "@/lib/notifications/vapid-config";

function buildHints(env: {
  hasServiceRoleKey: boolean;
  hasSupabaseUrl: boolean;
  hasSentryDsn: boolean;
  webPushEnabled: boolean;
  moderationAlertsEnabled: boolean;
  contactFormEnabled: boolean;
  hasCronSecret: boolean;
}): string[] {
  const hints: string[] = [];

  if (!env.hasServiceRoleKey) {
    hints.push("SUPABASE_SERVICE_ROLE_KEY is missing on Vercel (Production).");
  } else if (!env.hasSupabaseUrl) {
    hints.push("NEXT_PUBLIC_SUPABASE_URL looks wrong (should be https://xxx.supabase.co).");
  }

  if (!env.hasSentryDsn) {
    hints.push(
      "Sentry off — create a project at sentry.io, add NEXT_PUBLIC_SENTRY_DSN to Vercel, redeploy."
    );
  }

  if (!env.moderationAlertsEnabled) {
    hints.push(
      "Moderation alerts off — add SLACK_MODERATION_WEBHOOK_URL and/or RESEND_API_KEY + ADMIN_ALERT_EMAIL. Run npm run setup:ops."
    );
  }

  if (!env.webPushEnabled) {
    hints.push(
      "Web push off — run npm run setup:web-push, add WEB_PUSH_VAPID_CREDENTIALS to Vercel, redeploy."
    );
  }

  if (!env.contactFormEnabled) {
    hints.push(
      "Contact form off — set RESEND_API_KEY + ADMIN_ALERT_EMAIL (or CONTACT_* inbox overrides)."
    );
  }

  if (!env.hasCronSecret) {
    hints.push("CRON_SECRET missing — daily moderation auto-review cron won't authenticate.");
  }

  return hints;
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const hasUrl = url.startsWith("https://") && url.includes("supabase.co");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const env = {
    hasSupabaseUrl: hasUrl,
    hasAnonKey: anon.length > 20,
    hasServiceRoleKey: service.length > 20,
    hasSentryDsn: hasSentryDsn(),
    webPushEnabled: isWebPushConfigured(),
    hasResendApiKey: hasResendApiKey(),
    hasAdminAlertEmail: hasAdminAlertEmail(),
    hasSlackWebhook: hasSlackModerationWebhook(),
    moderationAlertsEnabled: isModerationAlertsConfigured(),
    contactFormEnabled: isContactFormConfigured(),
    hasCronSecret: hasCronSecret(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
  };

  const hints = buildHints(env);

  return NextResponse.json({
    ok: env.hasSupabaseUrl && env.hasAnonKey && env.hasServiceRoleKey,
    env,
    hints,
    hint: hints[0] ?? null,
  });
}
