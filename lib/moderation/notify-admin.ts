import { captureServerError } from "@/lib/capture-error";
import {
  hasAdminAlertEmail,
  hasResendApiKey,
  hasSlackModerationWebhook,
  resolveAlertsFromEmail,
} from "@/lib/email/resend-config";
import { sendEmailViaResend } from "@/lib/email/send-email";

type ModerationAlert = {
  type:
    | "report"
    | "auto_flag"
    | "severe_violation"
    | "admin_ban"
    | "avatar_rejected"
    | "restriction_appeal";
  reason: string;
  reportedUserId?: string;
  reporterId?: string;
  roomId?: string | null;
  details?: string | null;
  adminId?: string;
  aiScanResult?: string | null;
  hasEvidence?: boolean;
};

export async function notifyModerators(alert: ModerationAlert): Promise<void> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lovarena.app";
  const lines = [
    `Lovarena moderation · ${alert.type}`,
    `Reason: ${alert.reason}`,
    alert.reportedUserId ? `User: ${alert.reportedUserId}` : null,
    alert.reporterId ? `Reporter: ${alert.reporterId}` : null,
    alert.roomId ? `Room: ${alert.roomId}` : null,
    alert.details ? `Details: ${alert.details}` : null,
    alert.hasEvidence ? "Evidence: snapshot saved (admin dashboard)" : null,
    alert.aiScanResult ? `AI scan: ${alert.aiScanResult}` : null,
    alert.adminId ? `Admin: ${alert.adminId}` : null,
    `Dashboard: ${site}/admin`,
  ]
    .filter(Boolean)
    .join("\n");

  const tasks: Promise<void>[] = [];

  if (hasSlackModerationWebhook()) {
    const slackUrl = process.env.SLACK_MODERATION_WEBHOOK_URL!.trim();
    tasks.push(
      fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lines }),
      }).then(async (res) => {
        if (!res.ok) {
          await captureServerError(
            new Error(`Slack moderation webhook failed: ${res.status}`),
            { alertType: alert.type }
          );
        }
      })
    );
  }

  if (hasResendApiKey() && hasAdminAlertEmail()) {
    const alertEmail = process.env.ADMIN_ALERT_EMAIL!.trim();
    tasks.push(
      sendEmailViaResend({
        from: resolveAlertsFromEmail(),
        to: [alertEmail],
        subject: `[Lovarena] ${alert.type}: ${alert.reason}`,
        text: lines,
      }).then(async (sent) => {
        if (!sent) {
          await captureServerError(new Error("Moderation alert email failed"), {
            alertType: alert.type,
          });
        }
      })
    );
  }

  await Promise.allSettled(tasks);
}
