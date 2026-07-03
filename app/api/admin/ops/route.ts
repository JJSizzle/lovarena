import { NextRequest, NextResponse } from "next/server";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { captureServerError } from "@/lib/capture-error";
import {
  hasAdminAlertEmail,
  hasResendApiKey,
  hasSentryDsn,
  hasSlackModerationWebhook,
  isContactFormConfigured,
  isModerationAlertsConfigured,
} from "@/lib/email/resend-config";
import { notifyModerators } from "@/lib/moderation/notify-admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { rateLimitResponse } from "@/lib/rate-limit-response";
import {
  adminIpForbiddenResponse,
  getAdminAllowedIps,
  isAdminIpAllowed,
  isAdminIpAllowlistConfigured,
} from "@/lib/security/admin-access";
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    if (!auth.profile.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = clientIp(req);
    if (!isAdminIpAllowed(ip)) {
      return adminIpForbiddenResponse();
    }

    const allowedIps = getAdminAllowedIps();

    return NextResponse.json({
      clientIp: ip,
      adminIpAllowlistConfigured: isAdminIpAllowlistConfigured(),
      adminIpAllowed: true,
      allowedIpCount: allowedIps.length,
      sentryConfigured: hasSentryDsn(),
      moderationAlertsConfigured: isModerationAlertsConfigured(),
      slackConfigured: hasSlackModerationWebhook(),
      resendConfigured: hasResendApiKey(),
      adminAlertEmailConfigured: hasAdminAlertEmail(),
      contactFormConfigured: isContactFormConfigured(),
      emailAliases: [
        "support@lovarena.app",
        "safety@lovarena.app",
        "privacy@lovarena.app",
        "legal@lovarena.app",
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ops status failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    if (!auth.profile.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = clientIp(req);
    if (!isAdminIpAllowed(ip)) {
      return adminIpForbiddenResponse();
    }

    const rl = await rateLimit(`admin-ops:${auth.profile.id}:${ip}`, 10, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const parsed = await parseJsonBody<{ action?: string }>(req);
    if (!parsed.ok) return parsed.response;
    const { action } = parsed.data;

    if (action === "test_sentry") {
      if (!hasSentryDsn()) {
        return NextResponse.json(
          {
            error:
              "Sentry is not configured. Add NEXT_PUBLIC_SENTRY_DSN on Vercel and redeploy.",
          },
          { status: 400 }
        );
      }

      const testError = new Error("Lovarena admin Sentry test ping");
      await captureServerError(testError, {
        source: "admin_ops_test",
        adminId: auth.profile.id,
      });

      return NextResponse.json({
        ok: true,
        message: "Test error sent to Sentry. Check your Sentry project within a minute.",
      });
    }

    if (action === "test_moderation") {
      if (!isModerationAlertsConfigured()) {
        return NextResponse.json(
          {
            error:
              "Moderation alerts are not configured. Add SLACK_MODERATION_WEBHOOK_URL and/or RESEND_API_KEY + ADMIN_ALERT_EMAIL.",
          },
          { status: 400 }
        );
      }

      await notifyModerators({
        type: "report",
        reason: "Ops test ping from admin dashboard",
        reporterId: auth.profile.id,
        details: `Triggered by admin @${auth.profile.username ?? "admin"} from IP ${ip}.`,
      });

      return NextResponse.json({
        ok: true,
        message: "Test moderation alert sent to Slack and/or ADMIN_ALERT_EMAIL.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ops action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
