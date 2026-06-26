# Lovarena

Anonymous text chat with **Regional Matchmaking** or **Worldwide Arena** modes. Next.js + Supabase.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. If matching or messages fail, also run the fix scripts in `supabase/` as needed
4. Copy API keys into `.env.local` (see `.env.example`)

## Deploy on Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository
3. Add environment variables (same as `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy

Or with the Vercel CLI:

```bash
npx vercel
```

Add env vars in the Vercel dashboard under **Settings → Environment Variables**.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Webpack) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
