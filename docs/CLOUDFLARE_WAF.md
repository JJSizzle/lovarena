# Cloudflare WAF setup for Lovarena

Put **lovarena.app** behind Cloudflare for DDoS protection, bot filtering, and edge rate limits. Turnstile (captcha) is already separate — this guide covers DNS + WAF.

**Time:** ~30 minutes  
**Cost:** Free tier is enough to start

---

## 1. Add the domain

1. Sign up / log in at [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Add a site** → enter `lovarena.app`
3. Choose **Free** plan
4. Cloudflare scans existing DNS — confirm records point to Vercel:
   - `@` and `www` → CNAME to `cname.vercel-dns.com` (or your Vercel target)
5. Update nameservers at your registrar to Cloudflare’s pair
6. Wait until status shows **Active**

---

## 2. SSL/TLS

**SSL/TLS → Overview → Full (strict)**

Vercel already serves HTTPS; Full (strict) prevents SSL downgrade attacks.

---

## 3. Bot Fight Mode

**Security → Bots → Bot Fight Mode → On**

Blocks obvious automated traffic before it hits Vercel/Supabase.

---

## 4. Rate limiting rules (recommended)

**Security → WAF → Rate limiting rules → Create rule**

Create **three** rules (adjust if you hit free-tier limits):

### Rule A — Match spam

| Field | Value |
|-------|--------|
| Name | `API match throttle` |
| If | URI Path contains `/api/match` **OR** `/api/next` |
| Then | Block for 60 seconds |
| Rate | 30 requests per 60 seconds **per IP** |

### Rule B — Message spam

| Field | Value |
|-------|--------|
| Name | `API messages throttle` |
| If | URI Path contains `/api/messages` **OR** `/api/private-messages` **OR** `/api/party/messages` |
| Then | Block for 60 seconds |
| Rate | 120 requests per 60 seconds **per IP** |

### Rule C — Auth brute force

| Field | Value |
|-------|--------|
| Name | `Auth throttle` |
| If | URI Path contains `/api/auth` **OR** `/login` |
| Then | Block for 300 seconds |
| Rate | 20 requests per 60 seconds **per IP** |

> App-level rate limits still apply — Cloudflare is the first line of defense.

---

## 5. WAF custom rules (optional)

**Security → WAF → Custom rules**

### Block common probe paths

```
(http.request.uri.path contains "/wp-admin") or
(http.request.uri.path contains "/.env") or
(http.request.uri.path contains "/phpmyadmin")
```

Action: **Block**

### Challenge suspicious POST volume to APIs

If you see bot bursts on `/api/*`:

```
(http.request.method eq "POST") and
(http.request.uri.path starts_with "/api/") and
(cf.bot_management.score lt 30)
```

Action: **Managed Challenge** (requires Bot Management on paid plans)  
On Free: use rate limiting only.

---

## 6. Cache (don’t break the app)

**Caching → Configuration → Caching Level: Standard**

Create a **Cache Rule** to bypass cache for dynamic routes:

| If | URI Path starts with `/api/` **OR** `/chat` **OR** `/party` **OR** `/friends` |
| Then | Bypass cache |

Static assets (`/_next/static/*`, images) can stay cached.

---

## 7. Turnstile (already done)

Turnstile lives under **Turnstile** in Cloudflare, not WAF. Keys are in Vercel:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Verify: `/api/health` → `turnstileEnabled: true`

---

## 8. Verify after deploy

```powershell
npm run smoke:routes https://lovarena.app
curl https://lovarena.app/api/health
```

Check Cloudflare **Analytics → Security** after 24h for blocked/challenged requests.

---

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Redirect loop | SSL mode → **Full (strict)** |
| Real users blocked | Loosen rate limits; add IP allowlist for your office |
| WebRTC fails | Don’t proxy TURN — TURN uses separate host (Metered/Twilio), not lovarena.app |
| Admin locked out | Temporarily disable IP allowlist rule or add your IP in Cloudflare **IP Access Rules → Allow** |

---

## Checklist

- [ ] Domain active on Cloudflare (orange cloud proxied)
- [ ] SSL Full (strict)
- [ ] Bot Fight Mode on
- [ ] Rate limits on `/api/match`, `/api/messages`, `/login`
- [ ] API routes bypass cache
- [ ] `/api/health` still green after DNS cutover

See also: [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
