#!/usr/bin/env node
/**
 * Pre-release smoke — routes + /api/health env checks.
 *
 *   npm run verify:smoke
 *   npm run verify:smoke -- https://lovarena.app
 */

const base = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "https://lovarena.app").replace(
  /\/$/,
  ""
);

const routes = [
  { path: "/", label: "Home" },
  { path: "/login", label: "Login" },
  { path: "/chat", label: "Chat" },
  { path: "/friends", label: "Friends" },
  { path: "/party", label: "Party" },
  { path: "/settings", label: "Settings" },
  { path: "/profile", label: "Profile" },
  { path: "/onboarding", label: "Onboarding" },
  { path: "/contact", label: "Contact" },
  { path: "/privacy", label: "Privacy" },
  { path: "/terms", label: "Terms" },
  { path: "/omegle-alternative", label: "SEO landing" },
  { path: "/api/health", label: "Health API" },
  { path: "/api/stats/online", label: "Online stats" },
  { path: "/api/identity/webhook", label: "Persona webhook (GET ping)", expect: 200 },
];

function mark(ok) {
  return ok ? "✓" : "✗";
}

let failed = 0;

console.log(`\nLovarena smoke verify — ${base}\n`);

console.log("── Routes ──");
for (const route of routes) {
  const url = `${base}${route.path}`;
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15000) });
    const expected = route.expect ?? null;
    const ok =
      expected != null
        ? res.status === expected
        : res.status >= 200 && res.status < 400;
    console.log(`${mark(ok)} ${res.status} ${route.path} — ${route.label}`);
    if (!ok) failed += 1;
  } catch (err) {
    console.log(`✗ --- ${route.path} (${err instanceof Error ? err.message : err})`);
    failed += 1;
  }
}

console.log("\n── Health env ──");
try {
  const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  const env = data.env ?? {};

  const healthChecks = [
    ["ok", data.ok === true, "Supabase core"],
    ["securityOk", data.securityOk === true, "Security bundle"],
    ["turnstileEnabled", env.turnstileEnabled === true, "Turnstile captcha"],
    ["sightengineEnabled", env.sightengineEnabled === true, "Avatar moderation"],
    ["moderationAlertsEnabled", env.moderationAlertsEnabled === true, "Moderation alerts"],
    ["hasSentryDsn", env.hasSentryDsn === true, "Sentry"],
    ["webPushEnabled", env.webPushEnabled === true, "Web push"],
    ["contactFormEnabled", env.contactFormEnabled === true, "Contact form"],
    ["hasCronSecret", env.hasCronSecret === true, "Cron secret"],
  ];

  for (const [, ok, label] of healthChecks) {
    console.log(`${mark(ok)} ${label}`);
    if (!ok) failed += 1;
  }

  if (Array.isArray(data.hints) && data.hints.length > 0) {
    console.log("\nHints:");
    for (const hint of data.hints) {
      console.log(`  · ${hint}`);
    }
  }
} catch (err) {
  console.log(`✗ Health check failed (${err instanceof Error ? err.message : err})`);
  failed += 1;
}

console.log("\n── Manual (two browsers) ──");
console.log("  · Match two users, video + text, Next, Report, Block");
console.log("  · Friend request + DM + read receipt");
console.log("  · Party create/join (125+ rep host)");
console.log("  · Optional ID verification (when Persona prod live)");
console.log("  See docs/SMOKE_TEST.md for full checklist.\n");

if (failed > 0) {
  console.log(`${failed} automated check(s) failed.\n`);
  process.exitCode = 1;
} else {
  console.log("All automated smoke checks passed.\n");
}
