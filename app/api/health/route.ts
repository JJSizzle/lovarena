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
import {
  isSightengineConfigured,
  isTurnstileConfigured,
} from "@/lib/security/turnstile";
import {
  isIdVerificationPublic,
  isPersonaConfigured,
} from "@/lib/identity/persona-config";
import { isAdminIpAllowlistConfigured } from "@/lib/security/admin-access";
import { REVIEW_FLAGS_CRON } from "@/lib/cron/review-flags";

function buildHints(env: {
  hasServiceRoleKey: boolean;
  hasSupabaseUrl: boolean;
  hasSentryDsn: boolean;
  webPushEnabled: boolean;
  moderationAlertsEnabled: boolean;
  contactFormEnabled: boolean;
  hasCronSecret: boolean;
  cronSchedule: string;
  cronScheduleLabel: string;
  turnstileEnabled: boolean;
  sightengineEnabled: boolean;
  adminIpAllowlistConfigured: boolean;
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
  } else {
    hints.push(
      `Cron ${REVIEW_FLAGS_CRON.path} scheduled ${REVIEW_FLAGS_CRON.scheduleLabel} — run npm run verify:cron to test manually.`
    );
  }

  if (!env.turnstileEnabled) {
    hints.push(
      "Turnstile captcha off — add NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY (Cloudflare dashboard)."
    );
  }

  if (!env.sightengineEnabled) {
    hints.push(
      "Avatar photo moderation off — add SIGHTENGINE_API_USER + SIGHTENGINE_API_SECRET."
    );
  }

  if (!env.adminIpAllowlistConfigured && process.env.NODE_ENV === "production") {
    hints.push(
      "Admin IP allowlist off — set ADMIN_ALLOWED_IPS on Vercel (comma-separated) to lock /admin to your network."
    );
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
    cronPath: REVIEW_FLAGS_CRON.path,
    cronSchedule: REVIEW_FLAGS_CRON.schedule,
    cronScheduleLabel: REVIEW_FLAGS_CRON.scheduleLabel,
    turnstileEnabled: isTurnstileConfigured(),
    sightengineEnabled: isSightengineConfigured(),
    adminIpAllowlistConfigured: isAdminIpAllowlistConfigured(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    idVerificationComingSoon:
      isPersonaConfigured() && !isIdVerificationPublic(),
  };

  const hints = buildHints(env);

  const securityOk =
    env.hasSupabaseUrl &&
    env.hasAnonKey &&
    env.hasServiceRoleKey &&
    env.turnstileEnabled &&
    env.moderationAlertsEnabled;

  return NextResponse.json({
    ok: env.hasSupabaseUrl && env.hasAnonKey && env.hasServiceRoleKey,
    securityOk,
    env,
    hints,
    hint: hints[0] ?? null,
  });
}
