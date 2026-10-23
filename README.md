# TextMeQR 2.0

Dein Auto. Erreichbar. Privat. A rebuilt German automotive QR messaging product, independent of legacy WordPress and APlusConnect.

Repository: https://github.com/hsdarestani/textmeqr

## Implemented
- Premium responsive German landing page and mobile scan experience
- Passwordless login with six-digit email OTP
- Browser-generated unguessable QR links, one per vehicle
- Dashboard: create, rename, download, copy, pause/reactivate codes; scan counts
- Anonymous scan notices with reason and optional message
- Private D1 inbox with read status; optional Resend email notification
- Rate limiting, HMAC-hashed IP limit keys, input validation, origin check, HttpOnly session cookies, optional Turnstile
- Account deletion including related records; daily expiry cleanup

## Not yet operational
Physical sticker purchasing, verified legal pages, production notification email, domain routing, and migration from historical accounts require additional setup. The 2023 price of EUR 9.99 is historical only and is not advertised as a current offer.

## Stack
React 19, TypeScript, Vite 7, Cloudflare Workers, D1, Resend, optional Turnstile. QR images are generated in the browser without third-party QR APIs.

## Set up on Cloudflare
1. Use Node 22+; run npm install.
2. Use a trusted environment to run npx wrangler login.
3. Run npx wrangler d1 create textmeqr and replace REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID in wrangler.jsonc with the actual returned ID.
4. Set a fresh strong AUTH_SECRET (at least 32 random bytes) via npx wrangler secret put AUTH_SECRET.
5. Verify a sender domain in Resend and set RESEND_API_KEY and MAIL_FROM using wrangler secret put. Sender must be a real verified email address. Never store credentials in git.
6. Recommended: configure Cloudflare Turnstile and set BOTH TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY as secrets.
7. Run npm run db:remote, npm run check, npm run build and npm run deploy.
8. Attach textmeqr.de as the Worker custom domain through Cloudflare; preserve existing unrelated DNS.
9. Complete and legally review /datenschutz and /impressum with actual owner/operator information before any public launch.
10. Test email OTP, QR creation, anonymous scan and notice, inbox, QR download, deactivate/reactivate, logout, and account deletion in the live environment.

## Local development
Copy .dev.vars.example to .dev.vars, fill credentials, create the D1 binding ID in Wrangler, and apply migration using npm run db:local. Start npx wrangler dev for the API and static assets (build first). Alternatively use npm run dev for Vite hot reload while local Wrangler runs on port 8787.

## Commands
- npm run check: strict TypeScript check, Worker syntax check and unit tests
- npm run build: compile the React frontend to dist
- npm run db:local: D1 migrations locally
- npm run db:remote: D1 migrations in production
- npm run deploy: build and deploy Worker with assets

## Security and privacy
Owner identity, email address, and any phone number are never included in scan responses or QR payloads. Message contents are stored on D1, not end-to-end encrypted. The rate limiter stores keyed HMAC hashes of IP addresses, not cleartext IPs. Email is a best-effort notification only; delivered scan messages are always persisted in the dashboard first. The application has no fake payment, fake messaging or hard-coded demonstration credentials.

GDPR: the placeholder legal pages are NOT acceptable for a production launch. Document D1, Resend, Turnstile, data retention and deletion in an approved privacy policy. The database does not currently implement automatic message retention limits; account owners can erase their account.

IMPORTANT LEGACY COMPATIBILITY: TextMe was previously attached to aplusconnect.de using paths of the form /en/app...?...object=.... Those existing QR cards do not magically route to newly generated TextMeQR slugs. A legacy database/domain access and a planned redirect/migration are required to make old printed cards work.

See https://developers.cloudflare.com/workers/static-assets/ for Workers static assets configuration.
