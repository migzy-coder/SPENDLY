# Spendly brief

## 1. Product

Spendly is a mobile-first PWA for people in Cameroon who are paid on a monthly cycle. It turns
their balance, fixed costs and payday window into one honest number: what they can spend today.
The evening check-in takes three taps. Money is always integer XAF, dates are `YYYY-MM-DD` in
`Africa/Douala`, and no amount is ever invented by the app.

## 2. Stack

- Vite + React + TypeScript, Tailwind v4, motion, React Router.
- Cloudflare Worker (`worker/`) with Hono + Zod, D1 database (`spendly-db`), Clerk auth.
- Two transports behind `src/lib/api.ts`: remote Worker when Clerk is configured, local IndexedDB
  demo store (`src/lib/localdb.ts`) otherwise.
- Vitest for the pure money/selector modules; Wrangler for D1 migrations and deploy.

## 3. Money model (period based)

- A `period` runs from onboarding/salary confirmation to the day before the next payday. Without a
  fixed salary it uses a rolling 7/14/30-day horizon and rolls over automatically.
- `current balance = starting balance + income received − spending + balance adjustments`.
- `committed = fixed costs due + debt installments due + planned spending + savings set aside`.
- `free = current balance − committed`.
- `allowance = max(0, floor(free / days left including today / 100) * 100)`.
- Negative free shows the shortfall, never a silent zero. Corrections are adjustment records; the
  starting balance and history are never rewritten.
- Variable income counts only when received. Expected income is shown as "coming up" but excluded.
- Confirming a salary in the payday window closes the period and opens the next one with the
  balance carried over.

## 4. Screens

Today, Goals & Wishes, Stats, Plan (+ Fixed costs), Activity, Calendar, Simulator, Debts, Settings
(+ Profile, Reminders, Help, Income sources), onboarding, Welcome/Sign in, Offline, Not found.

## 5. Data

Tables: `users`, `month_plans` (calendar history only), `fixed_costs`, `entries`, `day_logs`,
`planned`, `wishes`, `goals`, `goal_contributions`, `debts`, `debt_payments`, `reminder_settings`,
plus `periods`, `income_sources`, `income_events`, `balance_adjustments`. Every query is scoped by
`user_id`.

## 6. Design rules (iOS style)

- Cream white background (`#FAF7F0`), white cards with soft shadows, light-blue/cobalt accent
  (`#2F6BF0`), navy ink (`#15233E`), gold for allowances, green for positive verdicts.
- Labelled tab bar with a central add button; never repeat the page title inside the page body.
- Large, tabular numbers for money; generous spacing; 20px+ rounded cards; calm motion.
- Mascot only large on white or cream surfaces, never on coloured category cards.
- Every string lives in `src/lib/i18n/fr.ts` and `src/lib/i18n/en.ts`. French is the launch
  language; English is a typed mirror.
- Short flows, one decision per step, every step skippable except the starting balance.
- No insights or statistical conclusions before 7 logged days: show "Collecting data" instead.
- No admin area, code-entry field, debug tool or environment-only UI for regular users.
