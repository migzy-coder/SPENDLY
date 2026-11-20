-- Budget periods, balance model, variable income and fixed-cost scheduling.
-- Every table is scoped by user_id; no existing row is deleted or rewritten.

ALTER TABLE users ADD COLUMN income_mode TEXT NOT NULL DEFAULT 'salary';
ALTER TABLE users ADD COLUMN rolling_horizon_days INTEGER NOT NULL DEFAULT 30;
ALTER TABLE users ADD COLUMN fixed_cost_dismissed INTEGER NOT NULL DEFAULT 0;

ALTER TABLE fixed_costs ADD COLUMN category TEXT NOT NULL DEFAULT 'Other';
ALTER TABLE fixed_costs ADD COLUMN frequency TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE fixed_costs ADD COLUMN due_day INTEGER;
ALTER TABLE fixed_costs ADD COLUMN due_date TEXT;

CREATE TABLE income_sources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  frequency TEXT,
  payday_day INTEGER,
  typical_amount INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE income_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE periods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  starting_balance INTEGER NOT NULL DEFAULT 0,
  horizon_days INTEGER NOT NULL DEFAULT 30,
  closed_at TEXT,
  salary_confirmed_at TEXT,
  balance_confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE balance_adjustments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_income_sources_user ON income_sources (user_id);
CREATE INDEX idx_income_events_user_date ON income_events (user_id, date);
CREATE INDEX idx_periods_user_dates ON periods (user_id, start_date, end_date);
CREATE INDEX idx_adjustments_user_period ON balance_adjustments (user_id, period_id);

-- Seed a primary salary source from each existing user's plan/payday so the
-- app can recognise the next salary and ask about it in the payday window.
INSERT INTO income_sources (id, user_id, name, type, frequency, payday_day, typical_amount, is_primary, created_at)
SELECT
  'legacy-salary-' || u.id,
  u.id,
  CASE WHEN u.locale = 'fr' THEN 'Salaire' ELSE 'Salary' END,
  'salary',
  'monthly',
  u.payday_day,
  COALESCE((SELECT p.income FROM month_plans p WHERE p.user_id = u.id ORDER BY p.month DESC LIMIT 1), 0),
  1,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM income_sources s WHERE s.user_id = u.id AND s.is_primary = 1);

-- One starting period per onboarded user. It begins today and ends the day
-- before the next payday, matching the old cycle boundary. The starting balance
-- absorbs spending from the old cycle before today so today's number does not jump.
INSERT INTO periods (id, user_id, start_date, end_date, starting_balance, horizon_days, created_at)
WITH
  today AS (SELECT date('now', '+1 hour') AS d),
  bounds AS (
    SELECT
      u.id AS uid,
      u.payday_day AS pd,
      today.d AS today,
      strftime('%Y-%m', today.d) AS ym,
      printf('%02d', u.payday_day) AS pdstr,
      strftime('%Y-%m', date(strftime('%Y-%m', today.d) || '-01', '+1 month')) AS next_ym,
      strftime('%Y-%m', date(strftime('%Y-%m', today.d) || '-01', '-1 month')) AS prev_ym
    FROM users u, today
    WHERE u.onboarded = 1
  ),
  ranges AS (
    SELECT
      uid,
      today,
      pd,
      CASE WHEN CAST(strftime('%d', today) AS INTEGER) <= pd
        THEN ym || '-' || pdstr ELSE next_ym || '-' || pdstr END AS next_pay,
      CASE WHEN CAST(strftime('%d', today) AS INTEGER) >= pd
        THEN ym || '-' || pdstr ELSE prev_ym || '-' || pdstr END AS old_start
    FROM bounds
  )
SELECT
  'legacy-period-' || r.uid,
  r.uid,
  r.today,
  date(r.next_pay, '-1 day'),
  COALESCE((
    SELECT p.income - p.wishlist_budget - (
      SELECT COALESCE(SUM(e.amount), 0) FROM entries e
      WHERE e.user_id = r.uid AND e.date >= r.old_start AND e.date < r.today
    )
    FROM month_plans p WHERE p.user_id = r.uid ORDER BY p.month DESC LIMIT 1
  ), 0),
  COALESCE((SELECT rolling_horizon_days FROM users WHERE id = r.uid), 30),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM ranges r
WHERE NOT EXISTS (SELECT 1 FROM periods p WHERE p.user_id = r.uid);
