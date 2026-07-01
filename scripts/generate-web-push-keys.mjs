#!/usr/bin/env node
/**
 * Generates VAPID keys for browser push. Run once, then paste into Vercel.
 *
 *   npm run setup:web-push
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
const subject = "mailto:support@lovarena.app";
const oneLine = `${keys.publicKey},${keys.privateKey}`;

console.log(`
Lovarena — Web Push setup (one-time)
====================================

1. Vercel → lovarena → Settings → Environment Variables → Production

2. Add ONE variable (easiest):

   Name:  WEB_PUSH_VAPID_CREDENTIALS
   Value: ${oneLine}

3. Optional (defaults to support@lovarena.app):

   Name:  WEB_PUSH_VAPID_SUBJECT
   Value: ${subject}

4. Redeploy (Deployments → ⋯ → Redeploy)

5. Confirm: https://lovarena.app/api/health  →  "webPushEnabled": true

6. In the app: Settings → Browser notifications → Enable push

---
Legacy (also works — two vars instead of one):
   WEB_PUSH_VAPID_PUBLIC_KEY=${keys.publicKey}
   WEB_PUSH_VAPID_PRIVATE_KEY=${keys.privateKey}
`);
