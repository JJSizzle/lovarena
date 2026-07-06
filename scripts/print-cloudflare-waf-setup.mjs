#!/usr/bin/env node
/**
 * Cloudflare WAF setup checklist (copy into dashboard).
 *
 *   npm run setup:cloudflare-waf
 */

console.log(`
Lovarena — Cloudflare WAF setup
================================

Full guide: docs/CLOUDFLARE_WAF.md

1) DNS (lovarena.app on Cloudflare, orange cloud ON)
   A     @    → 76.76.21.21        Proxied
   CNAME www  → cname.vercel-dns.com  Proxied

2) SSL/TLS → Overview → Full (strict)

3) Security → Bots → Bot Fight Mode → ON

4) Security → WAF → Rate limiting rules → Create 3 rules:

   Rule A — API match throttle
     If: URI Path contains /api/match OR /api/next
     Rate: 30 requests per 60 seconds per IP
     Action: Block for 60 seconds

   Rule B — API messages throttle
     If: URI Path contains /api/messages OR /api/private-messages OR /api/party/messages
     Rate: 120 requests per 60 seconds per IP
     Action: Block for 60 seconds

   Rule C — Auth throttle
     If: URI Path contains /api/auth OR /login
     Rate: 20 requests per 60 seconds per IP
     Action: Block for 300 seconds

5) Caching → Cache Rules → Bypass cache when:
     URI Path starts with /api/ OR /chat OR /party OR /friends

6) IMPORTANT — do NOT block these (allow through WAF):
     POST /api/identity/webhook  (Persona ID verification)
     POST /api/cron/review-flags (Vercel cron — uses CRON_SECRET)

7) Verify from your machine:
     npm run verify:cloudflare
     npm run verify:smoke

8) After 24h: Cloudflare → Analytics → Security (blocked/challenged)
`);
