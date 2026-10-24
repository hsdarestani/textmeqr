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
3. The D1 database has already been created. Its ID (8fbe9cca-e8e1-4365-94e5-5df27a7f29f7) is configured in wrangler.jsonc. Confirm that its actual name is textmeqr and it belongs to the same Cloudflare account as the smarbiz.sbs zone.
4. Set a fresh strong AUTH_SECRET (at least 32 random bytes) via npx wrangler secret put AUTH_SECRET.
5. Verify a sender domain in Resend and set RESEND_API_KEY and MAIL_FROM using wrangler secret put. Sender must be a real verified email address. Never store credentials in git.
6. Recommended: configure Cloudflare Turnstile and set BOTH TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY as secrets.
7. Run npm run db:remote, npm run check, npm run build and npm run deploy.
8. The Wrangler config already maps the Worker to textmeqr.smarbiz.sbs as a Custom Domain. It is created during the authenticated production deploy, provided the smarbiz.sbs zone is in the same account and the hostname has no conflicting CNAME. Do not set a dummy A record.
9. Complete and legally review /datenschutz and /impressum with actual owner/operator information before any public launch.
10. Test email OTP, QR creation, anonymous scan and notice, inbox, QR download, deactivate/reactivate, logout, and account deletion in the live environment.

## GitHub Actions manual deployment

A deployment workflow exists at .github/workflows/deploy.yml under GitHub Actions -> Deploy TextMeQR to Cloudflare. It starts automatically for relevant pushes to main or via Run workflow. It runs TypeScript/unit and visual checks, applies D1 migrations, then deploys the Worker, runtime secrets, and custom domain, performs live readiness checks, and validates the Resend sender against a test-only recipient.

The workflow runs on relevant code/configuration pushes to main and can also be launched manually. It checks the application, migrates D1, and deploys Worker code and its runtime secrets together. A successful deploy is not proof of actual inbox delivery; the workflow also tests a Resend sandbox recipient to validate the API key and verified sender.

Before running it, in GitHub repository -> Settings -> Secrets and variables -> Actions create:
- CLOUDFLARE_ACCOUNT_ID: the account identifier from your Cloudflare dashboard URL (511541f52b4f4d8342e055f5567ae169).
- CLOUDFLARE_API_TOKEN: a newly issued scoped token with Workers edit, D1 edit and appropriate custom-domain/zone permissions for the account. Never paste the token into the repository or into a chat.

In the same GitHub repository/environment Actions Secrets store, configure:
- AUTH_SECRET: a random secret with at least 24 characters (32+ bytes recommended).
- RESEND_API_KEY: production sending key from Resend.
- MAIL_FROM: sender identity for a domain already verified by Resend (for example TextMeQR <no-reply@textmeqr.smarbiz.sbs>).

The workflow automatically supplies these three GitHub secrets to Cloudflare Workers at deploy time using a private temporary secrets file, removed afterwards. Do **not** paste them into source, README, or chat. TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are recommended optional runtime secrets for a public launch and must be configured together directly on the Worker if enabled. Successful /api/config confirms presence, while the Resend sandbox check tests if the sender/API key are accepted. No production user registration works before AUTH_SECRET, the Resend key, and a verified MAIL_FROM are active.

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
