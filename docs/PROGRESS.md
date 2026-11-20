# Spendly progress

## Current state

The period-based money model is the source of truth for Today and Plan. Onboarding asks how a
person earns, their starting balance, the next income (or a rolling horizon), optional big payments
and a summary. Salary confirmation happens in the saved payday window (24–28 by default).

## Implemented

- `periods`, `income_sources`, `income_events`, `balance_adjustments` tables plus fixed-cost
  scheduling fields in migration `0003_periods_and_income.sql`. Existing users get one starting
  period computed from their current calendar-month data and a one-time balance confirmation.
- Money helpers and selectors: balance, committed, free, shortfall, allowance, period boundaries,
  fixed-cost occurrence generation, payday-window detection. All covered by Vitest.
- Income: Add income sheet (received/expected), income sources management in Settings, income vs
  spending in Stats (week/month), "Collecting data" before 7 logged days.
- Balance: Update balance sheet on Today and Settings, weekly nudge, balance confirmation for
  migrated users, signed adjustment records.
- Fixed costs: Plan → Fixed costs list with add/edit/delete, weekly/monthly/one-off scheduling and
  a Today reminder until at least one is added or dismissed.
- Salary prompt during the payday window; confirming it closes the period, carries the balance and
  opens the next one. Fixed-income earners can add variable side-income sources.
- Removed the `/admin` route and component, the Settings admin entry, the device-PIN code entry,
  the feature-flag module and all admin gating. `/admin` now falls through to `NotFound`.
- All icons regenerated from `docs/assets/icon.png`: favicon.ico (16/32/48), favicon-32.png,
  apple-touch-icon (180), PWA 192/512 and maskable 512. Stale SVG/Vite icons removed; cache-busting
  `?v=2` added to `index.html` and the PWA manifest.

## Verification

`pnpm run typecheck`, `pnpm test` (21 tests), `pnpm run lint` and `pnpm run build` are the gates.

## Manual steps for deployment

1. Apply migrations: `npx wrangler d1 migrations apply spendly-db --remote`.
2. Build and deploy, then purge the Cloudflare cache for `/favicon.ico`, `/favicon-32.png`,
   `/icons/*`, `/manifest.webmanifest` and `/index.html`.
3. In Clerk Dashboard → the Spendly app → **Branding → Icons and images**, upload the same
   `docs/assets/icon.png` as the application icon/logo and favicon so sign-in pages match.
4. Check a private window and the installed PWA (uninstall/reinstall if the old icon is cached).
