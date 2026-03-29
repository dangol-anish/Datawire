# Deploying Datawire to Vercel

This app runs on:
- Next.js App Router (Vercel)
- Supabase (Postgres + Auth + Realtime)
- NextAuth (Google/GitHub OAuth + Credentials)

## 1) Supabase setup

### Create a Supabase project
You’ll need:
- Project URL
- `anon` key
- `service_role` key

### Create required tables
Apply the SQL in:
- `docs/INVITES_SQL.md`

Notes:
- This repo uses Supabase **RLS** for normal CRUD (server mints a short-lived Supabase JWT using `SUPABASE_JWT_SECRET`).
- The **service role** key (`SUPABASE_SERVICE_ROLE_KEY`) is still required for admin-only operations (creating Supabase Auth users for OAuth + email/password signup).
- Some tables may not include `updated_at`. The app is tolerant of missing timestamp columns.

## 2) OAuth provider configuration

### Google OAuth
In Google Cloud Console:
- Application type: **Web application**
- Authorized JavaScript origins:
  - `http://localhost:3000`
  - `https://YOUR_PROD_DOMAIN` (Vercel)
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://YOUR_PROD_DOMAIN/api/auth/callback/google`

### GitHub OAuth
In GitHub OAuth Apps:
- Homepage URL:
  - `http://localhost:3000`
  - `https://YOUR_PROD_DOMAIN`
- Authorization callback URL:
  - `http://localhost:3000/api/auth/callback/github`
  - `https://YOUR_PROD_DOMAIN/api/auth/callback/github`

## 3) Environment variables (local + Vercel)

Copy `.env.example` → `.env.local` for local dev.

On Vercel, set these environment variables (Project → Settings → Environment Variables):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (set to your production domain, e.g. `https://yourapp.vercel.app`)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_ID`
- `GITHUB_SECRET`
- `INVITE_TOKEN_SALT` (optional)

Recommended:
- Set them for **Production** and **Preview** (if you use preview deployments).

## 4) Vercel deployment

1. Push your repo to GitHub.
2. In Vercel: “Add New Project” → import the repo.
3. Framework preset: Next.js
4. Build command: `next build` (default)
5. Output: (default)
6. Add env vars from section (3)
7. Deploy

## 5) Post-deploy checks

- Sign in at `/login` (Google/GitHub/email+password).
- Create a pipeline from the homepage.
- Open `/editor/[id]` and Save.
- Create an invite link and open it in an incognito browser.

If invite links look wrong on production:
- Confirm your Vercel domain matches `NEXTAUTH_URL`.
- Confirm Vercel forwards `x-forwarded-proto`/`x-forwarded-host` (Datawire uses these to build invite URLs).
