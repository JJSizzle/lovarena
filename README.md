# Lovarena

Live at **[lovarena.app](https://lovarena.app)** — anonymous video + text chat with **Regional Matchmaking** or **Worldwide Arena**. Next.js + Supabase.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `https://lovarena.app` (or `http://localhost:3000` locally) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Run `supabase/lovarena-match-modes.sql` for regional/worldwide matching
4. Run other fix scripts in `supabase/` if you hit permission or realtime issues

## Production (Vercel + lovarena.app)

1. Push to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add all env vars from `.env.example` (use `https://lovarena.app` for `NEXT_PUBLIC_SITE_URL`)
4. **Settings → Domains** → confirm `lovarena.app` is assigned
5. Redeploy after env changes

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Webpack) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
