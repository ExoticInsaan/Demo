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

## Before going live
- Switch `provider` in `prisma/schema.prisma` to `postgresql` and use a hosted database.
- Set `ADMIN_EMAILS`, `NEXTAUTH_SECRET` and `NEXTAUTH_URL` on the host.
- Deploy on Vercel (Cloudflare Pages needs extra setup for Prisma).
