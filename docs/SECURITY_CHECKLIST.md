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

- [ ] Domain on Cloudflare (DNS + optional WAF / Bot Fight Mode)
- [ ] Vercel HTTPS only; no secrets in client bundle
- [ ] Supabase: leaked-password protection enabled
- [ ] Admin account: MFA enabled in Supabase Auth
- [ ] `CRON_SECRET` set; Vercel cron hits `/api/cron/review-flags`

## App security (shipped in code)

- [ ] **Turnstile** on login (email) + contact form
- [ ] **Message moderation** — severe blocklist + spam filter (stranger, DM, party)
- [ ] **Tiered rate limits** — stricter for accounts < 24h old; IP cap on match
- [ ] **Report / block / admin** flows working
- [ ] **Avatar upload** — Sightengine nudity/offensive/gore scan

## Manual smoke (two browsers)

- [ ] New account cannot spam match (hits limit faster than established account)
- [ ] Party chat blocks URLs / “telegram me” style spam
- [ ] Contact form requires captcha when Turnstile configured
- [ ] Report in chat triggers Slack/email alert

## Optional next layers

- Cloudflare WAF rules for `/api/*`
- Phone verification before match
- Video frame sampling on reports
- Real ID age verification (Persona / Onfido)

See also: [SMOKE_TEST.md](./SMOKE_TEST.md)
