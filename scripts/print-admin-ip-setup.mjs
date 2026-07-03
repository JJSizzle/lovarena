#!/usr/bin/env node
/**
 * Trust & ops batch (#9) — print your public IP for ADMIN_ALLOWED_IPS.
 *
 *   npm run setup:admin-ip
 */

const inbox = process.env.ADMIN_ALERT_EMAIL ?? "your Gmail in Vercel";

async function fetchPublicIp() {
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return typeof data.ip === "string" ? data.ip : null;
  } catch {
    return null;
  }
}

const publicIp = await fetchPublicIp();

console.log(`
Lovarena — Admin IP allowlist (#9)
==================================

When you are NOT traveling, lock /admin to trusted networks:

1. Copy your current public IP (home Wi‑Fi / office):
   ${publicIp ?? "(could not detect — visit https://ifconfig.me/ip)"}

2. Vercel → lovarena project → Settings → Environment Variables → Production:
   ADMIN_ALLOWED_IPS=${publicIp ?? "203.0.113.10"},backup.ip.if.needed

3. Redeploy production.

4. Verify:
   - Open https://lovarena.app/api/network/ip in your browser — use THAT ip in Vercel
     (with Cloudflare it can differ from ipify / npm run setup:admin-ip)
   - Visit https://lovarena.app/admin from an allowed network → dashboard loads
   - Visit from mobile data / another network → "Admin blocked on this network"
   - https://lovarena.app/api/health → adminIpAllowlistConfigured: true

Tips:
  - Add a second IP if you use phone hotspot occasionally
  - Leave ADMIN_ALLOWED_IPS unset while traveling (admin open to any network)
  - Alerts still go to ${inbox} regardless of allowlist

Also run: npm run verify:ops
`);
