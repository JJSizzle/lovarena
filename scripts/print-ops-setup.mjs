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

4. Email aliases (receive mail at support@, safety@, etc.)
   - At your DNS host (Cloudflare, etc.), forward:
       support@lovarena.app  → your inbox
       safety@lovarena.app   → same or ADMIN_ALERT_EMAIL inbox
       privacy@lovarena.app  → your inbox
       legal@lovarena.app    → your inbox
   - Contact form uses ADMIN_ALERT_EMAIL unless you set:
       CONTACT_SUPPORT_EMAIL, CONTACT_SAFETY_EMAIL, etc.

5. Smoke test
   - Submit a test report in chat → Slack and/or email alert
   - Visit /contact → send a test message
   - Trigger a client error → confirm Sentry event

Health check: https://lovarena.app/api/health
`);
