#!/usr/bin/env node
/**
 * Easiest path to support@, safety@, privacy@, legal@ inboxes.
 *
 *   npm run setup:email-aliases
 */

const inbox = process.env.ADMIN_ALERT_EMAIL ?? "YOUR_GMAIL@gmail.com";

console.log(`
Lovarena — Email aliases (easy mode)
====================================

GOOD NEWS: Your contact form already works (no DNS needed for that).
Messages from https://lovarena.app/contact go to ADMIN_ALERT_EMAIL in Vercel.

Set up forwarding ONLY if you want mailto links like support@lovarena.app
to work when someone emails you outside the website.

Recommended inbox to forward everything to:
  ${inbox}

---
OPTION A — Cloudflare Email Routing (FREE, ~5 min)
Use this if lovarena.app DNS is on Cloudflare.

1. Open https://dash.cloudflare.com
2. Click domain  lovarena.app
3. Left sidebar → Email → Email Routing
4. Click  Enable Email Routing  (Cloudflare adds MX records for you)
5. Destination addresses →  Add destination address
   → enter ${inbox}  → verify the code Cloudflare emails you
6. Routing rules → Create address  (repeat 4 times):

   Custom address          Action
   ----------------        ---------------------------
   support@lovarena.app    Send to → ${inbox}
   safety@lovarena.app     Send to → ${inbox}
   privacy@lovarena.app    Send to → ${inbox}
   legal@lovarena.app      Send to → ${inbox}

7. Test: email support@lovarena.app from your phone → should land in ${inbox}

---
OPTION B — ImprovMX (FREE, works on any DNS host)
Use this if your domain is NOT on Cloudflare (e.g. only on Vercel/GoDaddy).

1. Sign up at https://improvmx.com
2. Add domain  lovarena.app
3. ImprovMX shows 2 MX records — add them where you manage DNS:
     MX  @  mx1.improvmx.com   priority 10
     MX  @  mx2.improvmx.com   priority 20
4. In ImprovMX → Aliases, add (all forward to ${inbox}):

   support@lovarena.app
   safety@lovarena.app
   privacy@lovarena.app
   legal@lovarena.app

5. Wait ~15 min for DNS, then send a test email to support@lovarena.app

---
SKIP THIS ENTIRELY IF:
  - You are fine with the /contact form only
  - Report alerts already hit Slack + ADMIN_ALERT_EMAIL
  - You do not need people to email support@ directly yet

---
Quick test after setup
  Send to: support@lovarena.app
  Subject: Lovarena alias test
  You should receive it at ${inbox} within a minute.
`);
