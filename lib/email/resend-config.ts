export type ContactTopic = "general" | "safety" | "privacy" | "legal";

export function hasResendApiKey(): boolean {
  return (process.env.RESEND_API_KEY?.trim().length ?? 0) > 5;
}

export function hasAdminAlertEmail(): boolean {
  return (process.env.ADMIN_ALERT_EMAIL?.trim().includes("@") ?? false);
}

export function hasSlackModerationWebhook(): boolean {
  const url = process.env.SLACK_MODERATION_WEBHOOK_URL?.trim() ?? "";
  return url.startsWith("https://hooks.slack.com/");
}

export function isModerationAlertsConfigured(): boolean {
  return (
    hasSlackModerationWebhook() || (hasResendApiKey() && hasAdminAlertEmail())
  );
}

export function resolveAlertsFromEmail(): string {
  return (
    process.env.RESEND_ALERTS_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Lovarena <alerts@lovarena.app>"
  );
}

export function resolveContactFromEmail(): string {
  return resolveAlertsFromEmail();
}

export function resolveTransactionalFromEmail(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() || "Lovarena <hello@lovarena.app>"
  );
}

export function resolveContactInbox(_topic: ContactTopic): string | null {
  const email = process.env.ADMIN_ALERT_EMAIL?.trim();
  return email?.includes("@") ? email : null;
}

export function isContactFormConfigured(): boolean {
  return hasResendApiKey() && resolveContactInbox("general") !== null;
}

export function hasSentryDsn(): boolean {
  return (process.env.NEXT_PUBLIC_SENTRY_DSN?.trim().length ?? 0) > 20;
}

export function hasCronSecret(): boolean {
  return (process.env.CRON_SECRET?.trim().length ?? 0) > 16;
}
