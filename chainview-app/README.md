# ChainView (Next.js)

Tron wallet tracker with login, admin panel and one-level referral. Read-only: it never holds funds or asks for private keys.

## Run locally
```
cp .env.example .env     # fill in the values
npm install
npx prisma db push
npm run dev
```
Google login: create OAuth credentials in Google Cloud Console and add `http://localhost:3000/api/auth/callback/google` as a redirect URI.

## Deploy on Cloudflare Workers
The app runs on Cloudflare Workers through OpenNext, with Prisma connecting to Supabase Postgres via Hyperdrive.

1. Create the tables once: put the Supabase connection string in `.env` as `DATABASE_URL`, then run `npx prisma db push`.
2. Create the Hyperdrive config and paste its id into `wrangler.jsonc`:
   `npx wrangler hyperdrive create chainview --connection-string="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"`
3. Add secrets: `npx wrangler secret put NEXTAUTH_SECRET` (also `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`, `TRONGRID_API_KEY`) and set `NEXTAUTH_URL` to the deployed URL (`npx wrangler secret put NEXTAUTH_URL`).
4. `npm run deploy`
5. In Google Cloud Console add `https://<your-worker-url>/api/auth/callback/google` as an authorised redirect URI.

Local preview on the Workers runtime: copy `.dev.vars.example` to `.dev.vars`, then `npm run preview`.
