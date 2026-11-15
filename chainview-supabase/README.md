# ChainView

Tron wallet tracker with energy-pack purchases, refund requests and a one-level referral reward. A static Next.js site (works on Cloudflare Pages). Login and data go directly to Supabase and are protected by row-level security.

It never holds customer balances, never asks for private keys and promises no returns.

## Run locally
```
cp .env.example .env.local
npm install
npm run dev
```
## Database
Migrations were applied through Supabase (tables prefixed `cv_`). Admin emails live in the `cv_admins` table. The company payment wallet is set from the Admin tab.

## Deploy (Cloudflare Pages)
Root directory `chainview-supabase`, build command `npm run build`, output directory `out`, env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
