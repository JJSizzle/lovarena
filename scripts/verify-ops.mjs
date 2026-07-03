#!/usr/bin/env node
/**
 * Trust & ops batch (#9–12) — verify production config from your machine.
 *
 *   npm run verify:ops
 *   npm run verify:ops -- https://lovarena.app
 */

const base = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "https://lovarena.app").replace(
  /\/$/,
  ""
);

function status(ok) {
  return ok ? "✓" : "✗";
}

async function fetchPublicIp() {
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.ip === "string" ? data.ip : null;
  } catch {
    return null;
  }
}

let failed = 0;

console.log(`\nLovarena ops verify — ${base}\n`);

try {
  const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(15000) });
  const data = await res.json();

  if (!res.ok) {
    console.log(`FAIL health endpoint HTTP ${res.status}`);
    process.exitCode = 1;
    process.exit();
  }

  const env = data.env ?? {};

  const checks = [
    {
      id: 9,
      label: "ADMIN_ALLOWED_IPS (optional lock)",
      ok: env.adminIpAllowlistConfigured === true,
      hint: env.adminIpAllowlistConfigured
        ? "Allowlist active — /admin restricted to listed IPs"
        : "Not set — run npm run setup:admin-ip when back on a trusted network",
    },
    {
      id: 10,
      label: "Email / contact delivery (Resend)",
      ok: env.contactFormEnabled === true,
      hint: env.contactFormEnabled
        ? "Contact form works — run npm run setup:email-aliases for support@ forwarding"
        : "Set RESEND_API_KEY + ADMIN_ALERT_EMAIL on Vercel",
    },
    {
      id: 11,
      label: "Moderation alerts (Slack and/or email)",
      ok: env.moderationAlertsEnabled === true,
      hint: env.moderationAlertsEnabled
        ? `Slack: ${env.hasSlackWebhook ? "yes" : "no"} · Email: ${env.hasResendApiKey && env.hasAdminAlertEmail ? "yes" : "no"}`
        : "Add SLACK_MODERATION_WEBHOOK_URL and/or RESEND + ADMIN_ALERT_EMAIL",
    },
    {
      id: 12,
      label: "Sentry error monitoring",
      ok: env.hasSentryDsn === true,
      hint: env.hasSentryDsn
        ? "DSN configured — use Admin → Ops → Send test error"
        : "Add NEXT_PUBLIC_SENTRY_DSN on Vercel and redeploy",
    },
  ];

  for (const check of checks) {
    console.log(`#${check.id} ${status(check.ok)} ${check.label}`);
    console.log(`    ${check.hint}`);
    if (!check.ok && check.id !== 9) failed += 1;
  }

  console.log(`\nHealth ok: ${data.ok ? "yes" : "no"} · securityOk: ${data.securityOk ? "yes" : "no"}`);

  if (Array.isArray(data.hints) && data.hints.length > 0) {
    console.log("\nRemaining hints:");
    for (const hint of data.hints) {
      console.log(`  - ${hint}`);
    }
  }
} catch (err) {
  console.log(`FAIL could not reach ${base}/api/health`);
  console.log(`    ${err instanceof Error ? err.message : err}`);
  failed += 1;
}

const publicIp = await fetchPublicIp();
if (publicIp) {
  console.log(`\nYour public IP (for ADMIN_ALLOWED_IPS): ${publicIp}`);
}

console.log("\nManual checks:");
console.log("  - /admin → Ops panel → Send test moderation alert");
console.log("  - /admin → Ops panel → Send test Sentry error");
console.log("  - Email support@lovarena.app → should land in ADMIN_ALERT_EMAIL (if aliases set up)");

if (failed > 0) {
  process.exitCode = 1;
  console.log(`\n${failed} required check(s) failed. Optional #9 allowlist is not counted.\n`);
} else {
  console.log("\nRequired ops checks passed (allowlist #9 is optional).\n");
}
