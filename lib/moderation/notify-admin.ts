type ModerationAlert = {
  type:
    | "report"
    | "auto_flag"
    | "severe_violation"
    | "admin_ban"
    | "avatar_rejected";
  reason: string;
  reportedUserId?: string;
  reporterId?: string;
  roomId?: string | null;
  details?: string | null;
  adminId?: string;
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
    alert.adminId ? `Admin: ${alert.adminId}` : null,
    `Dashboard: ${site}/admin`,
  ]
    .filter(Boolean)
    .join("\n");

  const tasks: Promise<void>[] = [];

  const slackUrl = process.env.SLACK_MODERATION_WEBHOOK_URL;
  if (slackUrl) {
    tasks.push(
      fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lines }),
      }).then(() => undefined)
    );
  }

  const resendKey = process.env.RESEND_API_KEY;
  const alertEmail = process.env.ADMIN_ALERT_EMAIL;
  if (resendKey && alertEmail) {
    const from =
      process.env.RESEND_FROM_EMAIL ?? "Lovarena <alerts@lovarena.app>";
    tasks.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [alertEmail],
          subject: `[Lovarena] ${alert.type}: ${alert.reason}`,
          text: lines,
        }),
      }).then(() => undefined)
    );
  }

  await Promise.allSettled(tasks);
}
