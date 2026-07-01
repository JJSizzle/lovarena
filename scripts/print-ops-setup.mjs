#!/usr/bin/env node
/**
 * Batch C ops checklist — Sentry, moderation alerts, Resend, email aliases.
 *
 *   npm run setup:ops
 */

console.log(`
Lovarena — Ops setup (Batch C)
==============================

1. Sentry (error monitoring)
   - Create a free project at https://sentry.io
   - Vercel → Environment Variables → Production:
       NEXT_PUBLIC_SENTRY_DSN=https://your-key@o000.ingest.us.sentry.io/000
   - Redeploy → https://lovarena.app/api/health → hasSentryDsn: true

2. Moderation alerts (Slack and/or email)
   - Slack: create Incoming Webhook → add:
       SLACK_MODERATION_WEBHOOK_URL=https://hooks.slack.com/services/...
   - Resend: verify lovarena.app at https://resend.com/domains
   - Vercel → Production:
       RESEND_API_KEY=re_xxxx
       ADMIN_ALERT_EMAIL=you@gmail.com
       RESEND_ALERTS_FROM_EMAIL=Lovarena <alerts@lovarena.app>
       RESEND_FROM_EMAIL=Lovarena <hello@lovarena.app>
   - Redeploy → /api/health → moderationAlertsEnabled: true

3. Daily auto-review cron
   - Generate a long random string for:
       CRON_SECRET=...
   - Vercel cron runs /api/cron/review-flags (see vercel.json)

4. Email aliases (optional — contact form already works without this)
   - Run:  npm run setup:email-aliases
   - Easiest: Cloudflare Email Routing (free) → forward all 4 addresses to ADMIN_ALERT_EMAIL

5. Smoke test
   - Submit a test report in chat → Slack and/or email alert
   - Visit /contact → send a test message
   - Trigger a client error → confirm Sentry event

6. Cloudflare Turnstile (login + contact captcha)
   - https://dash.cloudflare.com → Turnstile → Add site (lovarena.app)
   - Vercel → Production:
       NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
       TURNSTILE_SECRET_KEY=...
   - Redeploy → /api/health → turnstileEnabled: true
   - Test /login and /contact show captcha

7. Avatar moderation (Sightengine)
   - https://sightengine.com → API credentials
   - Vercel → Production:
       SIGHTENGINE_API_USER=...
       SIGHTENGINE_API_SECRET=...
   - Redeploy → /api/health → sightengineEnabled: true

8. Admin IP allowlist (optional)
   - Vercel → Production:
       ADMIN_ALLOWED_IPS=your.public.ip,backup.ip
   - Redeploy → /admin only works from those IPs

9. Security tier 2 SQL
   - Supabase SQL Editor → run supabase/security-tier2.sql
   - Verify check-migrations rows 19–20

Health check: https://lovarena.app/api/health
`);
