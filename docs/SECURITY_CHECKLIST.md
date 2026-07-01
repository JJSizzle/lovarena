# Lovarena security checklist

Use this after deploy or when hardening production. Cross-check with `/api/health`.

## Automated checks

```powershell
npm run build
npm run smoke:routes https://lovarena.app
curl https://lovarena.app/api/health
```

Health should report:

| Field | Target |
|-------|--------|
| `ok` | `true` (Supabase env present) |
| `securityOk` | `true` (core + Turnstile + moderation alerts) |
| `env.turnstileEnabled` | `true` |
| `env.sightengineEnabled` | `true` (avatar moderation) |
| `env.moderationAlertsEnabled` | `true` |
| `env.hasCronSecret` | `true` |

## Supabase SQL (run once per environment)

1. `supabase/check-migrations.sql` — all rows ✅
2. `supabase/production-security-bundle.sql` — stranger messages RLS
3. `supabase/security-and-legal.sql` — reports, blocks, rate limits (if fresh DB)

## Cloudflare Turnstile (bot protection)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → Turnstile → Add site
2. Vercel → Production env:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public)
   - `TURNSTILE_SECRET_KEY` (secret)
3. Redeploy
4. Verify: `/login` and `/contact` show captcha widget
5. Sign-in without completing captcha should fail

## Infrastructure

- [ ] Domain on Cloudflare (DNS + WAF) — see [CLOUDFLARE_WAF.md](./CLOUDFLARE_WAF.md)
- [ ] Vercel HTTPS only; no secrets in client bundle
- [ ] Supabase: leaked-password protection enabled
- [ ] Admin account: MFA enabled in Supabase Auth
- [ ] `CRON_SECRET` set; Vercel cron hits `/api/cron/review-flags`

## App security (shipped in code)

- [ ] **Turnstile** on login (email) + contact form
- [ ] **Turnstile on match** for accounts < 24h old (one-time grant)
- [ ] **Message moderation** — severe blocklist + spam filter (stranger, DM, party)
- [ ] **Tiered rate limits** — stricter for accounts < 24h old; IP cap on match
- [ ] **Admin audit log** — ban/unflag/appeal/report actions in `admin_audit_log`
- [ ] **Admin IP allowlist** — optional `ADMIN_ALLOWED_IPS` on Vercel
- [ ] **Report / block / admin** flows working
- [ ] **Avatar upload** — Sightengine nudity/offensive/gore scan
- [ ] **Reputation gating** — party unlocks at 125 rep, pauses below 75; low rep (≤75) gets slower match limits

## Security tier 2 SQL

Run once in Supabase SQL Editor:

```sql
-- supabase/security-tier2.sql
```

Then verify rows 19–20 in `supabase/check-migrations.sql`.

## Admin hardening

1. Supabase Auth → enable TOTP under Authentication → Providers (or MFA settings)
2. Users enroll at **Settings → Account security → Enable 2FA** (or manage existing TOTP)
3. Optional: `ADMIN_ALLOWED_IPS` on Vercel to lock `/admin` API to known IPs
4. `/admin` dashboard shows audit log for recent actions

## Manual smoke (two browsers)

- [ ] New account cannot spam match (hits limit faster than established account)
- [ ] Party chat blocks URLs / “telegram me” style spam
- [ ] Contact form requires captcha when Turnstile configured
- [ ] Report in chat triggers Slack/email alert

## Optional next layers

- Turnstile on **Google OAuth** sign-in path
- **Structured security logs** (rate-limit hits, failed auth patterns)
- **Tighter CSP** (drop `unsafe-eval` / `unsafe-inline` where possible)
- Phone verification before match
- Video frame sampling on reports
- Real ID age verification (Persona / Onfido)

See also: [SMOKE_TEST.md](./SMOKE_TEST.md), [CLOUDFLARE_WAF.md](./CLOUDFLARE_WAF.md)
