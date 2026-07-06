# Lovarena pre-release smoke test

Run after deploy or before tagging a release. Use two signed-in accounts (normal + incognito) for match/party flows.

## Automated (local or production)

```powershell
npm run build
npm run verify:smoke
npm run verify:smoke -- https://lovarena.app
npm run verify:cloudflare
npm run smoke:routes https://lovarena.app
```

- `verify:smoke` — routes + `/api/health` env checks (recommended before release)
- `verify:cloudflare` — confirms `cf-ray` / Cloudflare proxy + WAF dashboard checklist
- `smoke:routes` — quick HTTP status on key pages

Cloudflare WAF rules: `npm run setup:cloudflare-waf` then follow `docs/CLOUDFLARE_WAF.md`.

## Manual checklist

### Health & static

- [ ] `/api/health` — all checks green (Supabase, Sentry, Resend, Slack, cron, Turnstile, Sightengine)
- [ ] `/`, `/login`, `/contact`, `/privacy`, `/terms` load without console errors
- [ ] Favicon and PWA manifest icons load

### Auth & onboarding

- [ ] Sign in (email or Google)
- [ ] Age gate appears once; `/chat` requires sign-in + verified age
- [ ] Onboarding tour can be skipped or completed
- [ ] MFA enroll + login step works (if testing admin account)

### Stranger chat

- [ ] Two users enter queue — match connects within ~30s
- [ ] Video/audio toggles work; text chat sends and receives
- [ ] **Next** ends session and re-queues
- [ ] **Report** and **Block** use styled confirm dialogs (not browser `confirm`)
- [ ] Ice breaker opens accessible modal; **Send to chat** posts message
- [ ] New account (<24h) sees Turnstile once before first match
- [ ] Low reputation account (≤75) matches slower (5s poll) and hits stricter rate limits

### Friends & DMs

- [ ] Accept friend request from match or `/friends`
- [ ] Friends list shows counter (`X / 200`); full-list warning at cap
- [ ] Private message sends; read receipt shows **Seen** when appropriate
- [ ] Remove friend and block show styled confirms
- [ ] Block vs remove explainer visible on `/friends`
- [ ] Mobile: tapping a friend scrolls chat into view

### Party

- [ ] Host unlocks at **125+ rep**; keeps hosting until rep drops **below 75**
- [ ] Below 125 without unlock — Create party disabled; join-by-code still works
- [ ] Host selects friend from dropdown → **Send invite** → friend gets push notification
- [ ] Invite code join still works
- [ ] Friend can join; non-friend sees friends-only callout
- [ ] Party chat shows **Seen** when all members have chat open
- [ ] End party uses confirm modal; kick member uses styled confirm
- [ ] Leave party returns to lobby cleanly

### Settings & push

- [ ] Match prefs save on **Save settings**
- [ ] Browser notifications toggle auto-saves
- [ ] Contact form sends (check inbox / Resend dashboard)
- [ ] Settings toggles have screen-reader labels

### Admin (moderators only)

- [ ] `/admin` loads with arena theme
- [ ] Ban / unflag / appeal actions use styled confirms
- [ ] Audit log shows recent admin actions

### Infrastructure (after Cloudflare cutover)

- [ ] Site loads via Cloudflare (check response headers for `cf-ray`)
- [ ] WebRTC video still connects (TURN is separate from Cloudflare proxy)
- [ ] No redirect loops on login

## Two-session setup

1. Browser A — your main account  
2. Browser B — incognito or second browser, second account  
3. Both complete age gate and enter **Regional** or **Global** queue on `/chat`

## Reputation gating quick test

1. Use an account with reputation **≤75** (or temporarily lower in Supabase for testing)
2. `/party` — **Create party** disabled; join-by-code still works
3. `/chat` — match queue polls every ~5s; rapid spam hits “Matching is limited…” 429
4. Account that hit 125+ once can still host at 100 rep until dropping below 75

## If something fails

1. Check Vercel deploy logs and `/api/health`  
2. Supabase — Auth users, RLS errors in logs  
3. Browser console + Network tab for failed API routes  
4. Cloudflare **Security → Events** if edge blocks look suspicious
