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

- Onboarding: income type, starting balance, next income window, optional big payments, summary
- **Today** home: available to spend until the period end, daily allowance, category breakdown, salary prompt, income and balance actions
- **Goals & Wishes**: savings goals with contributions, wishlist with a waiting period before buying
- **Stats**: monthly overview, category mix, weekend effect, exports
- **Plan**: income, savings target and wishlist envelope per month
- **Activity**, **Calendar**, **Debt tracker**, **Affordability simulator**
- **Settings**: profile, theme, language, privacy, reminders, data export and account deletion
- **Income**: salary and variable sources, received/expected income events, fixed costs, balance adjustments

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
- A budget period starts on the day onboarding finishes (or the day the salary is confirmed) and
  ends the day before the next payday. Without a fixed salary it is a rolling 7/14/30-day horizon.
- Money: `current balance = starting balance + income received − spending + adjustments`;
  `free = balance − committed`; allowance = `floor(free / days left / 100) * 100`.
- All money logic lives in `src/lib/money.ts` and `src/lib/selectors.ts`, covered by Vitest.
- UI copy lives in `src/lib/i18n/fr.ts` (source dictionary) and `src/lib/i18n/en.ts` (typed mirror),
  so a missing key fails the typecheck.
- Icons are generated from `docs/assets/icon.png` with `python scripts/icons.py`.
