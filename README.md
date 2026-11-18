# Spendly

Spendly is a mobile-first PWA that tells you every evening what you can still spend.
It runs on a Vite + React front end with a Hono API on Cloudflare Workers and a D1 database.

## Stack

- **Front end:** React 19, React Router, Tailwind CSS 4, TanStack Query, Motion, i18n (FR/EN)
- **Back end:** Hono Worker (`worker/app.ts`), D1 (`spendly-db`), Zod validation
- **Auth:** Clerk (`@clerk/react`, token verification in the Worker)
- **Offline:** IndexedDB cache and write queue; demo mode without Clerk keys
- **PWA:** `vite-plugin-pwa` (installable, offline shell, update prompt)

## Features

- Onboarding questionnaire: income, fixed costs, payday range, savings goal, wishlist item, nightly reminder
- **Today** home: left to spend, daily allowance, category breakdown, planned spending actions, streak
- **Goals & Wishes**: savings goals with contributions, wishlist with a waiting period before buying
- **Stats**: monthly overview, category mix, weekend effect, exports
- **Plan**: income, savings target and wishlist envelope per month
- **Activity**, **Calendar**, **Debt tracker**, **Affordability simulator**
- **Settings**: profile, theme, language, privacy, reminders, data export and account deletion
- **Admin** (`/admin`): local feature flags behind a device PIN

## Local development

```powershell
npx --yes pnpm@10 install
npx --yes pnpm@10 run dev
```

Without `VITE_CLERK_PUBLISHABLE_KEY` the app runs in **demo/local mode** with device-only data.

```powershell
npx --yes pnpm@10 run typecheck
npx --yes pnpm@10 run test
npx --yes pnpm@10 run lint
npx --yes pnpm@10 run build
```

## Database

```powershell
npx --yes pnpm@10 run db:migrate        # local D1
npx --yes pnpm@10 run db:migrate:remote # remote D1
```

## Deployment

Deployed as the `spendly` Worker at `https://spendly.miguelyango.com` (custom domain; the
`miguelyango.com` root site is unaffected). See [`docs/RUNBOOK.md`](docs/RUNBOOK.md) for Clerk,
secrets, D1 and deploy steps.

```powershell
npx --yes pnpm@10 run build
npx wrangler deploy
```

## Conventions

- Money is stored as whole XAF integers; dates are `YYYY-MM-DD` in `Africa/Douala`.
- Budget cycles start on the saved payday (first day of the payday window) and end the day
  before the next one; plan records are keyed by the month the cycle starts in.
- UI copy lives in `src/lib/i18n/fr.ts` (source dictionary) and `src/lib/i18n/en.ts` (typed mirror),
  so a missing key fails the typecheck.
- Feature flags live in `src/lib/features.ts`; all features ship enabled and `/admin` can hide them.
