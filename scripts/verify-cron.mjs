#!/usr/bin/env node
/**
 * Cron verification (#17) — manually trigger review-flags with CRON_SECRET.
 *
 *   CRON_SECRET=your-secret npm run verify:cron
 *   npm run verify:cron -- https://lovarena.app
 */

const base = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "https://lovarena.app").replace(
  /\/$/,
  ""
);
const secret = process.env.CRON_SECRET?.trim();

if (!secret) {
  console.error(`
CRON_SECRET is not set.

1. Vercel → Environment Variables → copy CRON_SECRET (Production)
2. PowerShell:
     $env:CRON_SECRET = "paste-secret-here"
     npm run verify:cron

Or check Vercel → Project → Cron Jobs → review-flags → Logs after 06:00 UTC.
`);
  process.exitCode = 1;
  process.exit();
}

const url = `${base}/api/cron/review-flags`;

try {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json();

  if (!res.ok) {
    console.error(`FAIL HTTP ${res.status}`);
    console.error(JSON.stringify(data, null, 2));
    process.exitCode = 1;
    process.exit();
  }

  console.log("OK review-flags cron");
  console.log(JSON.stringify(data, null, 2));
  console.log(`
Next: Vercel → Cron Jobs → /api/cron/review-flags → confirm daily runs at 06:00 UTC.
`);
} catch (err) {
  console.error(`FAIL could not reach ${url}`);
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
