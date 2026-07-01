# Lovarena pre-release smoke test

Run after deploy or before tagging a release. Use two signed-in accounts (normal + incognito) for match/party flows.

## Automated (local or production)

```powershell
npm run build
npm run smoke:routes
```

`smoke:routes` hits key pages and `/api/health` — see `scripts/smoke-routes.mjs`.

## Manual checklist

### Health & static

- [ ] `/api/health` — all checks green (Supabase, Sentry, Resend, Slack, cron, etc.)
- [ ] `/`, `/login`, `/contact`, `/privacy`, `/terms` load without console errors
- [ ] Favicon and PWA manifest icons load

### Auth & onboarding

- [ ] Sign in (email or Google)
- [ ] Age gate appears once; `/chat` requires sign-in + verified age
- [ ] Onboarding tour can be skipped or completed

### Stranger chat

- [ ] Two users enter queue — match connects within ~30s
- [ ] Video/audio toggles work; text chat sends and receives
- [ ] **Next** ends session and re-queues
- [ ] **Report** and **Block** use styled confirm dialogs (not browser `confirm`)
- [ ] Ice breaker opens accessible modal; **Send to chat** posts message

### Friends & DMs

- [ ] Accept friend request from match or `/friends`
- [ ] Private message sends; read receipt shows **Seen** when appropriate
- [ ] Remove friend and block show styled confirms
- [ ] Mobile: tapping a friend scrolls chat into view

### Party

- [ ] Host creates party; friend can join (non-friend sees friends-only callout)
- [ ] End party uses confirm modal; kick member uses styled confirm
- [ ] Leave party returns to lobby cleanly

### Settings & push

- [ ] Match prefs save on **Save settings**
- [ ] Browser notifications toggle auto-saves
- [ ] Contact form sends (check inbox / Resend dashboard)

### Admin (moderators only)

- [ ] `/admin` loads with arena theme
- [ ] Ban / unflag / appeal actions use styled confirms

## Two-session setup

1. Browser A — your main account  
2. Browser B — incognito or second browser, second account  
3. Both complete age gate and enter **Regional** or **Global** queue on `/chat`

## If something fails

1. Check Vercel deploy logs and `/api/health`  
2. Supabase — Auth users, RLS errors in logs  
3. Browser console + Network tab for failed API routes
