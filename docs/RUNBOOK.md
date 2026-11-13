# Spendly runbook

Spendly is a Vite + React PWA with a Cloudflare Worker API (`/api/*`) and D1 database, served at `https://spendly.miguelyango.com` (custom domain on the `spendly` Worker). The root `miguelyango.com` site must not be affected.

## Prerequisites
- Node.js 20.9+ (current Clerk/SDK requirement), pnpm (`npx pnpm@10 ...` works), Wrangler/Cloudflare account access.
- Clerk application (Dashboard-selected): **`app_3Lz0n85A1J4EiSbujavPhCNAGPC`**.
- GitHub repo: https://github.com/migzy-coder/SPENDLY

## Local development
```powershell
npx --yes pnpm@10 install
# create .env from .env.example and set VITE_CLERK_PUBLISHABLE_KEY (see Clerk below)
npx --yes pnpm@10 run dev
```
- Without `VITE_CLERK_PUBLISHABLE_KEY` the app runs in **demo/local mode** (local device data, no real Clerk sign-in).
- Typecheck/build: `npx --yes pnpm@10 run typecheck` / `npx --yes pnpm@10 run build`.

## Clerk (connect app `app_3Lz0n85A1J4EiSbujavPhCNAGPC`)
Clerk is already integrated in this project (`@clerk/react` provider + `<SignIn/>`/`<SignUp/>` routes, Worker token verification via `@clerk/backend`). **Do not run `clerk init`** and do not create/switch applications.

1. In **your own terminal** (browser login required), from the project folder:
   ```powershell
   npx -y clerk@latest auth login
   npx -y clerk@latest link --app app_3Lz0n85A1J4EiSbujavPhCNAGPC
   npx -y clerk@latest env pull
   ```
   - Only if the project is not already linked. Do **not** replace working keys or switch from a different application without confirmation.
   - `env pull` writes development keys to the detected env file; copy/map them for this stack (see below). Never pull production keys without `--print`.
2. **Frontend (build-time):** set `VITE_CLERK_PUBLISHABLE_KEY=pk_...` in `.env` (local) and ensure it is present when building for deploy. (If Clerk wrote `CLERK_PUBLISHABLE_KEY`/`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, use its value as `VITE_CLERK_PUBLISHABLE_KEY`.)
3. **Worker (runtime secrets):**
   ```powershell
   npx wrangler secret put CLERK_SECRET_KEY   # sk_...
   npx wrangler secret put CLERK_JWT_KEY      # optional, if required
   ```
4. **Clerk Dashboard config:** enable Google + email code; allow origins/redirects for `http://localhost:5173` and `https://spendly.miguelyango.com` (and `/today` post-auth) so sign-in works locally and on the deployed domain.

## Cloudflare deploy (Workers + D1 + custom domain)
```powershell
npx wrangler login
npx wrangler d1 create spendly-db
# copy database_id into wrangler.jsonc -> d1_databases[0].database_id (binding DB, name spendly-db)
npx wrangler d1 migrations apply spendly-db --remote

npx --yes pnpm@10 run build
npx wrangler deploy
```
- **Custom domain:** Workers & Pages → `spendly` → Settings → Domains & Routes → Add Custom domain → `spendly.miguelyango.com` (subdomain only; does not affect `miguelyango.com` root).
- Worker secrets (optional): `SENTRY_DSN`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`. Frontend build-time (optional): `VITE_SENTRY_DSN`, `VITE_SENTRY_RELEASE`, `VITE_CF_ANALYTICS_TOKEN`.

## Verify
- Open `https://spendly.miguelyango.com` on a phone: sign in (Google/email code), complete onboarding (scroll through all fields), and test the core flow.
- Local: `npx -y clerk@latest doctor` (after keys are configured) and `npx --yes pnpm@10 run dev`.

## Notes
- `VITE_*` vars are baked in at **build time** — redeploy (`build` + `wrangler deploy`) after changing them.
- Worker secrets are set via `wrangler secret put` (runtime). Keep secrets out of git; `.env`/`.dev.vars` are gitignored.
- Money is stored as integer XAF; day boundaries use `Africa/Douala`.
