CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  payday_day INTEGER NOT NULL DEFAULT 25,
  nightly_time TEXT NOT NULL DEFAULT '21:00',
  timezone TEXT NOT NULL DEFAULT 'Africa/Douala',
  locale TEXT NOT NULL DEFAULT 'fr',
  theme TEXT NOT NULL DEFAULT 'light',
  onboarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE month_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,
  income INTEGER NOT NULL DEFAULT 0,
  savings_target INTEGER NOT NULL DEFAULT 0,
  wishlist_budget INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, month)
);

CREATE TABLE fixed_costs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  recurring INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  payment_type TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  client_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, client_id)
);

CREATE TABLE day_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  spent_nothing INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, date)
);

CREATE TABLE planned (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE wishes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'Other',
  link TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'Want',
  unlock_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  wait_until TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target INTEGER NOT NULL,
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE goal_contributions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE debts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  person TEXT NOT NULL,
  direction TEXT NOT NULL,
  total INTEGER NOT NULL,
  installments INTEGER NOT NULL,
  frequency TEXT NOT NULL,
  first_due_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE debt_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  debt_id TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE reminder_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  time_choice TEXT NOT NULL DEFAULT '21:00',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, key)
);

CREATE INDEX idx_entries_user_date ON entries (user_id, date);
CREATE INDEX idx_planned_user_date ON planned (user_id, date);
CREATE INDEX idx_day_logs_user_date ON day_logs (user_id, date);
CREATE INDEX idx_fixed_user ON fixed_costs (user_id);
CREATE INDEX idx_wishes_user ON wishes (user_id);
CREATE INDEX idx_goals_user ON goals (user_id);
CREATE INDEX idx_debts_user ON debts (user_id);
