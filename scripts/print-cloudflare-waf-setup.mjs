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

4) Security → WAF → Rate limiting rules

   FREE PLAN — one combined rule (10-second window):
     If expression:
       (starts_with(http.request.uri.path, "/api/match")) or
       (starts_with(http.request.uri.path, "/api/next")) or
       (starts_with(http.request.uri.path, "/api/messages")) or
       (starts_with(http.request.uri.path, "/api/private-messages")) or
       (starts_with(http.request.uri.path, "/api/auth")) or
       (starts_with(http.request.uri.path, "/login"))
     Rate: 20 requests per 10 seconds per IP  (recommended — ~120/min)
           — or 10 / 10s (~60/min) minimum safe setting
     Action: Block for 60 seconds

   (30/min is too low for match polling on shared Wi-Fi. Free = one rule only.)

5) Caching → Cache Rules → Bypass cache when expression matches:
     (starts_with(http.request.uri.path, "/api/")) or
     (starts_with(http.request.uri.path, "/chat")) or
     (starts_with(http.request.uri.path, "/party")) or
     (starts_with(http.request.uri.path, "/friends"))

6) IMPORTANT — do NOT block these (allow through WAF):
     POST /api/identity/webhook  (Persona ID verification)
     POST /api/cron/review-flags (Vercel cron — uses CRON_SECRET)

7) Verify from your machine:
     npm run verify:cloudflare
     npm run verify:smoke

8) After 24h: Cloudflare → Analytics → Security (blocked/challenged)
`);
