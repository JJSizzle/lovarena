#!/usr/bin/env node
/**
 * Verify lovarena.app is behind Cloudflare and print WAF checklist.
 *
 *   npm run verify:cloudflare
 *   npm run verify:cloudflare -- https://lovarena.app
 */

const base = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "https://lovarena.app").replace(
  /\/$/,
  ""
);

function mark(ok) {
  return ok ? "✓" : "✗";
}

let failed = 0;

console.log(`\nLovarena Cloudflare verify — ${base}\n`);

let headers = {};
try {
  const res = await fetch(base, {
    method: "HEAD",
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  headers = Object.fromEntries(res.headers.entries());
  const cfRay = headers["cf-ray"];
  const server = headers["server"] ?? "";
  const proxied = Boolean(cfRay);
  const cloudflareServer = /cloudflare/i.test(server);

  console.log("── Edge detection (automated) ──");
  console.log(`${mark(proxied)} cf-ray header present — ${cfRay ?? "missing"}`);
  console.log(`${mark(cloudflareServer || proxied)} Cloudflare edge — server: ${server || "(none)"}`);
  console.log(`${mark(res.url.startsWith("https://"))} HTTPS — ${res.url}`);

  if (!proxied) {
    failed += 1;
    console.log(
      "\nSite may not be proxied through Cloudflare (orange cloud off or DNS not cut over)."
    );
  }
} catch (err) {
  console.log(`✗ Could not reach ${base} (${err instanceof Error ? err.message : err})`);
  failed += 1;
}

console.log("\n── WAF checklist (confirm in Cloudflare dashboard) ──");
const manual = [
  ["SSL/TLS → Full (strict)", "Prevents SSL downgrade"],
  ["Security → Bots → Bot Fight Mode ON", "Blocks obvious bots"],
  [
    "Rate limit: /api/match OR /api/next — 30 req / 60s per IP",
    "Match spam protection",
  ],
  [
    "Rate limit: /api/messages OR /api/private-messages OR /api/party/messages — 120 req / 60s per IP",
    "Message spam protection",
  ],
  [
    "Rate limit: /api/auth OR /login — 20 req / 60s per IP",
    "Auth brute-force protection",
  ],
  ["Cache bypass for /api/, /chat, /party, /friends", "Don't cache dynamic routes"],
  ["Persona webhook /api/identity/webhook allowed", "POST from Persona must not be blocked"],
];

for (const [item, why] of manual) {
  console.log(`  [ ] ${item}`);
  console.log(`      ${why}`);
}

console.log("\nSetup guide: docs/CLOUDFLARE_WAF.md");
console.log("Quick print:  npm run setup:cloudflare-waf\n");

if (failed > 0) {
  console.log("Fix Cloudflare DNS/proxy first, then add WAF rules in the dashboard.\n");
  process.exitCode = 1;
} else {
  console.log("Cloudflare proxy looks good. Finish WAF rate limits in the dashboard if not done yet.\n");
}
