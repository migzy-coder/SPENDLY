import { createClerkClient, verifyToken } from "@clerk/backend";
import { Hono } from "hono";
import { z } from "zod";
import { addDays, debtSchedule, periodEndFor, todayISO } from "../src/lib/money";

export type Env = {
  DB: D1Database;
  CLERK_SECRET_KEY?: string;
  CLERK_JWT_KEY?: string;
  SENTRY_DSN?: string;
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

const hits = new Map<string, { count: number; reset: number }>();

function allow(key: string): boolean {
  const now = Date.now();
  const row = hits.get(key);
  if (!row || row.reset < now) {
    hits.set(key, { count: 1, reset: now + 60_000 });
    return true;
  }
  row.count += 1;
  return row.count <= 120;
}

const category = z.enum(["Food", "Transport", "Airtime", "Clothes", "Social", "Other"]);
const money = z.number().int().min(0).max(100_000_000);
const dateISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const idParam = z.string().min(8).max(80);
const frequency = z.enum(["weekly", "monthly", "one_off"]);
const incomeMode = z.enum(["salary", "variable", "both"]);
const sourceType = z.enum(["salary", "business", "freelance", "side", "gift", "other"]);

type PeriodRow = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  starting_balance: number;
  horizon_days: number;
  closed_at: string | null;
  salary_confirmed_at: string | null;
  balance_confirmed_at: string | null;
};

/** Balance at a point in a period: starting + income received − spending + adjustments. */
async function balanceInPeriod(db: D1Database, userId: string, period: PeriodRow): Promise<number> {
  const [income, spent, adjustments] = await Promise.all([
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM income_events WHERE user_id = ? AND status = 'received' AND date >= ? AND date <= ?")
      .bind(userId, period.start_date, period.end_date).first<{ total: number }>(),
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM entries WHERE user_id = ? AND date >= ? AND date <= ?")
      .bind(userId, period.start_date, period.end_date).first<{ total: number }>(),
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM balance_adjustments WHERE user_id = ? AND period_id = ?")
      .bind(userId, period.id).first<{ total: number }>(),
  ]);
  return Math.trunc(
    period.starting_balance + (income?.total ?? 0) - (spent?.total ?? 0) + (adjustments?.total ?? 0),
  );
}

/** Open a period for today when none is active, carrying the previous balance. */
async function ensureActivePeriod(db: D1Database, userId: string): Promise<PeriodRow | null> {
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<Record<string, unknown>>();
  if (!user || user.onboarded !== 1) return null;
  const today = todayISO();
  const rows = await db.prepare("SELECT * FROM periods WHERE user_id = ? ORDER BY start_date DESC").bind(userId).all<PeriodRow>();
  const active = rows.results.find((p) => p.start_date <= today && p.end_date >= today && !p.closed_at);
  if (active) return active;

  const previous = rows.results[0] ?? null;
  const carry = previous ? await balanceInPeriod(db, userId, previous) : 0;
  const horizon = user.income_mode === "variable" ? Number(user.rolling_horizon_days ?? 30) : 0;
  const start = today;
  const end = periodEndFor(start, Number(user.payday_day ?? 25), horizon);
  const period: PeriodRow = {
    id: crypto.randomUUID(),
    user_id: userId,
    start_date: start,
    end_date: end,
    starting_balance: carry,
    horizon_days: horizon,
    closed_at: null,
    salary_confirmed_at: null,
    balance_confirmed_at: null,
  };
  await db.prepare(`INSERT INTO periods (id, user_id, start_date, end_date, starting_balance, horizon_days, closed_at, salary_confirmed_at, balance_confirmed_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL)`)
    .bind(period.id, userId, start, end, carry, horizon).run();
  if (previous && previous.end_date < today) {
    await db.prepare("UPDATE periods SET closed_at = ? WHERE id = ? AND user_id = ?")
      .bind(new Date().toISOString(), previous.id, userId).run();
  }
  return period;
}

app.use("/api/*", async (c, next) => {
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  const path = new URL(c.req.url).pathname;
  if (path === "/api/health") return next();
  const secret = c.env.CLERK_SECRET_KEY;
  if (!secret) return c.json({ error: "auth_not_configured" }, 503);
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return c.json({ error: "unauthorized" }, 401);
  try {
    const payload = await verifyToken(token, {
      secretKey: secret,
      jwtKey: c.env.CLERK_JWT_KEY,
    });
    const userId = payload.sub;
    if (!userId) return c.json({ error: "unauthorized" }, 401);
    if (!allow(userId)) return c.json({ error: "rate_limited" }, 429);
    c.set("userId", userId);
    await next();
  } catch {
    return c.json({ error: "unauthorized" }, 401);
  }
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/bootstrap", async (c) => {
  const userId = c.get("userId");
  const user = await ensureUser(c, userId);
  const db = c.env.DB;
  await ensureActivePeriod(db, userId);
  const [
    plans, fixedCosts, entries, dayLogs, planned, goals, contributions,
    wishes, debts, payments, reminders, periods, incomeSources, incomeEvents, adjustments,
  ] = await Promise.all([
    db.prepare("SELECT * FROM month_plans WHERE user_id = ? ORDER BY month DESC LIMIT 12").bind(userId).all(),
    db.prepare("SELECT * FROM fixed_costs WHERE user_id = ? ORDER BY created_at").bind(userId).all(),
    db.prepare("SELECT * FROM entries WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 2000").bind(userId).all(),
    db.prepare("SELECT * FROM day_logs WHERE user_id = ? ORDER BY date DESC LIMIT 400").bind(userId).all(),
    db.prepare("SELECT * FROM planned WHERE user_id = ? ORDER BY date").bind(userId).all(),
    db.prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at").bind(userId).all(),
    db.prepare("SELECT * FROM goal_contributions WHERE user_id = ? ORDER BY date DESC").bind(userId).all(),
    db.prepare("SELECT * FROM wishes WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all(),
    db.prepare("SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all(),
    db.prepare("SELECT * FROM debt_payments WHERE user_id = ? ORDER BY due_date").bind(userId).all(),
    db.prepare("SELECT * FROM reminder_settings WHERE user_id = ?").bind(userId).all(),
    db.prepare("SELECT * FROM periods WHERE user_id = ? ORDER BY start_date DESC LIMIT 24").bind(userId).all(),
    db.prepare("SELECT * FROM income_sources WHERE user_id = ? ORDER BY created_at").bind(userId).all(),
    db.prepare("SELECT * FROM income_events WHERE user_id = ? ORDER BY date DESC LIMIT 1000").bind(userId).all(),
    db.prepare("SELECT * FROM balance_adjustments WHERE user_id = ? ORDER BY date DESC LIMIT 1000").bind(userId).all(),
  ]);
  return c.json({
    user,
    plans: plans.results,
    fixedCosts: fixedCosts.results,
    entries: entries.results,
    dayLogs: dayLogs.results,
    planned: planned.results,
    goals: goals.results,
    contributions: contributions.results,
    wishes: wishes.results,
    debts: debts.results,
    payments: payments.results,
    reminders: reminders.results,
    periods: periods.results,
    incomeSources: incomeSources.results,
    incomeEvents: incomeEvents.results,
    adjustments: adjustments.results,
  });
});

const setupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  paydayDay: z.number().int().min(1).max(31),
  paydayDayEnd: z.number().int().min(1).max(31).optional(),
  nightlyTime: z.string().regex(/^\d{2}:\d{2}$/),
  locale: z.enum(["fr", "en"]),
  incomeMode,
  balance: money,
  nextIncomeDate: dateISO.nullable(),
  horizonDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  bigPayments: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    amount: money,
    date: dateISO,
  })).max(20),
  fixedCosts: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    amount: money,
    category,
    frequency,
    dueDay: z.number().int().min(1).max(31).nullable(),
    dueDate: dateISO.nullable(),
  })).max(30),
  goal: z.object({ name: z.string().trim().min(1).max(80), target: money, dueDate: dateISO.nullable() }).nullable(),
});

app.post("/api/setup", async (c) => {
  const userId = c.get("userId");
  const body = setupSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const data = body.data;
  const db = c.env.DB;
  const paydayEnd = data.paydayDayEnd ?? data.paydayDay;
  await db.prepare(
    `INSERT INTO users (id, name, payday_day, payday_day_end, nightly_time, locale, onboarded, timezone, income_mode, rolling_horizon_days)
     VALUES (?, ?, ?, ?, ?, ?, 1, 'Africa/Douala', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       payday_day = excluded.payday_day,
       payday_day_end = excluded.payday_day_end,
       nightly_time = excluded.nightly_time,
       locale = excluded.locale,
       income_mode = excluded.income_mode,
       rolling_horizon_days = excluded.rolling_horizon_days,
       onboarded = 1`,
  ).bind(userId, data.name, data.paydayDay, paydayEnd, data.nightlyTime, data.locale, data.incomeMode, data.horizonDays).run();

  const today = todayISO();
  const end = data.incomeMode === "variable" && data.nextIncomeDate
    ? addDays(data.nextIncomeDate, -1)
    : periodEndFor(today, data.paydayDay, data.incomeMode === "variable" ? data.horizonDays : 0);
  await db.prepare(`INSERT INTO periods (id, user_id, start_date, end_date, starting_balance, horizon_days, closed_at, salary_confirmed_at, balance_confirmed_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?)`)
    .bind(crypto.randomUUID(), userId, today, end, data.balance, data.horizonDays, new Date().toISOString()).run();

  if (data.incomeMode === "salary" || data.incomeMode === "both") {
    await db.prepare(`INSERT INTO income_sources (id, user_id, name, type, frequency, payday_day, typical_amount, is_primary)
      VALUES (?, ?, ?, 'salary', 'monthly', ?, 0, 1)`)
      .bind(crypto.randomUUID(), userId, data.locale === "fr" ? "Salaire" : "Salary", data.paydayDay).run();
  }
  if (data.incomeMode === "variable" || data.incomeMode === "both") {
    await db.prepare(`INSERT INTO income_sources (id, user_id, name, type, frequency, payday_day, typical_amount, is_primary)
      VALUES (?, ?, ?, 'side', NULL, NULL, 0, 0)`)
      .bind(crypto.randomUUID(), userId, data.locale === "fr" ? "Revenu variable" : "Side income").run();
  }

  for (const cost of data.fixedCosts) {
    await db.prepare(`INSERT INTO fixed_costs (id, user_id, name, amount, recurring, category, frequency, due_day, due_date)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), userId, cost.name, cost.amount, cost.category, cost.frequency, cost.dueDay, cost.dueDate).run();
  }
  for (const item of data.bigPayments) {
    await db.prepare("INSERT INTO planned (id, user_id, name, date, category, amount, status) VALUES (?, ?, ?, ?, 'Other', ?, 'planned')")
      .bind(crypto.randomUUID(), userId, item.name, item.date, item.amount).run();
  }
  if (data.goal) {
    await db.prepare("INSERT INTO goals (id, user_id, name, target, due_date) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), userId, data.goal.name, data.goal.target, data.goal.dueDate).run();
  }
  return c.json({ ok: true });
});

const planSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  income: money,
  savingsTarget: money,
  wishlistBudget: money,
});

app.put("/api/plan", async (c) => {
  const userId = c.get("userId");
  const body = planSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const data = body.data;
  await c.env.DB.prepare(
    `INSERT INTO month_plans (id, user_id, month, income, savings_target, wishlist_budget)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, month) DO UPDATE SET income = excluded.income, savings_target = excluded.savings_target, wishlist_budget = excluded.wishlist_budget`,
  ).bind(crypto.randomUUID(), userId, data.month, data.income, data.savingsTarget, data.wishlistBudget).run();
  return c.json({ ok: true });
});

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  paydayDay: z.number().int().min(1).max(31),
  paydayDayEnd: z.number().int().min(1).max(31).optional(),
  nightlyTime: z.string().regex(/^\d{2}:\d{2}$/),
  locale: z.enum(["fr", "en"]),
  theme: z.enum(["light", "dark", "system"]),
  incomeMode: incomeMode.optional(),
  horizonDays: z.union([z.literal(7), z.literal(14), z.literal(30)]).optional(),
});

app.patch("/api/profile", async (c) => {
  const userId = c.get("userId");
  const body = profileSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const data = body.data;
  const paydayEnd = data.paydayDayEnd ?? data.paydayDay;
  const existing = await c.env.DB.prepare("SELECT income_mode, rolling_horizon_days FROM users WHERE id = ?")
    .bind(userId).first<{ income_mode: string; rolling_horizon_days: number }>();
  const mode = data.incomeMode ?? existing?.income_mode ?? "salary";
  const horizon = data.horizonDays ?? existing?.rolling_horizon_days ?? 30;
  await c.env.DB.prepare("UPDATE users SET name = ?, payday_day = ?, payday_day_end = ?, nightly_time = ?, locale = ?, theme = ?, income_mode = ?, rolling_horizon_days = ? WHERE id = ?")
    .bind(data.name, data.paydayDay, paydayEnd, data.nightlyTime, data.locale, data.theme, mode, horizon, userId).run();
  return c.json({ ok: true });
});

const costSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: money,
  category,
  frequency,
  dueDay: z.number().int().min(1).max(31).nullable(),
  dueDate: dateISO.nullable(),
});

app.post("/api/fixed-costs", async (c) => {
  const userId = c.get("userId");
  const body = costSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const id = crypto.randomUUID();
  const d = body.data;
  await c.env.DB.prepare(`INSERT INTO fixed_costs (id, user_id, name, amount, recurring, category, frequency, due_day, due_date)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`)
    .bind(id, userId, d.name, d.amount, d.category, d.frequency, d.dueDay, d.dueDate).run();
  return c.json({ id });
});

app.patch("/api/fixed-costs/:id", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  const body = costSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) return c.json({ error: "invalid" }, 400);
  const d = body.data;
  await c.env.DB.prepare(`UPDATE fixed_costs SET name = ?, amount = ?, category = ?, frequency = ?, due_day = ?, due_date = ?
    WHERE id = ? AND user_id = ?`)
    .bind(d.name, d.amount, d.category, d.frequency, d.dueDay, d.dueDate, id.data, c.get("userId")).run();
  return c.json({ ok: true });
});

app.delete("/api/fixed-costs/:id", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "invalid" }, 400);
  await c.env.DB.prepare("DELETE FROM fixed_costs WHERE id = ? AND user_id = ?").bind(id.data, c.get("userId")).run();
  return c.json({ ok: true });
});

app.post("/api/fixed-costs/dismiss-reminder", async (c) => {
  await c.env.DB.prepare("UPDATE users SET fixed_cost_dismissed = 1 WHERE id = ?").bind(c.get("userId")).run();
  return c.json({ ok: true });
});

const entrySchema = z.object({
  id: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  date: dateISO,
  category,
  amount: money,
  paymentType: z.enum(["Cash", "Transfer", "Mobile Money"]),
  note: z.string().max(280).default(""),
});

app.post("/api/entries", async (c) => {
  const userId = c.get("userId");
  const body = entrySchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const data = body.data;
  const id = data.id ?? crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO entries (id, user_id, date, category, amount, payment_type, note, client_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, client_id) DO UPDATE SET date = excluded.date, category = excluded.category, amount = excluded.amount, payment_type = excluded.payment_type, note = excluded.note`,
  ).bind(id, userId, data.date, data.category, data.amount, data.paymentType, data.note, data.clientId).run();
  return c.json({ id });
});

app.patch("/api/entries/:id", async (c) => {
  const userId = c.get("userId");
  const id = idParam.safeParse(c.req.param("id"));
  const body = entrySchema.omit({ id: true, clientId: true }).safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) return c.json({ error: "invalid" }, 400);
  const data = body.data;
  await c.env.DB.prepare(
    "UPDATE entries SET date = ?, category = ?, amount = ?, payment_type = ?, note = ? WHERE id = ? AND user_id = ?",
  ).bind(data.date, data.category, data.amount, data.paymentType, data.note, id.data, userId).run();
  return c.json({ ok: true });
});

app.delete("/api/entries/:id", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "invalid" }, 400);
  await c.env.DB.prepare("DELETE FROM entries WHERE id = ? AND user_id = ?").bind(id.data, c.get("userId")).run();
  return c.json({ ok: true });
});

app.post("/api/day-logs", async (c) => {
  const userId = c.get("userId");
  const body = z.object({ date: dateISO, spentNothing: z.boolean() }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  await c.env.DB.prepare(
    `INSERT INTO day_logs (id, user_id, date, spent_nothing) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET spent_nothing = excluded.spent_nothing`,
  ).bind(crypto.randomUUID(), userId, body.data.date, body.data.spentNothing ? 1 : 0).run();
  return c.json({ ok: true });
});

const plannedSchema = z.object({
  name: z.string().trim().min(1).max(80),
  date: dateISO,
  category,
  amount: z.number().int().positive().max(100_000_000),
});

app.post("/api/planned", async (c) => {
  const userId = c.get("userId");
  const body = plannedSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const id = crypto.randomUUID();
  const data = body.data;
  await c.env.DB.prepare("INSERT INTO planned (id, user_id, name, date, category, amount, status) VALUES (?, ?, ?, ?, ?, ?, 'planned')")
    .bind(id, userId, data.name, data.date, data.category, data.amount).run();
  return c.json({ id });
});

app.post("/api/planned/:id/done", async (c) => {
  const userId = c.get("userId");
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "invalid" }, 400);
  const row = await c.env.DB.prepare("SELECT * FROM planned WHERE id = ? AND user_id = ?").bind(id.data, userId).first<{
    name: string; date: string; category: string; amount: number; status: string;
  }>();
  if (!row || row.status === "done") return c.json({ error: "not_found" }, 404);
  const clientId = crypto.randomUUID();
  const entryId = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE planned SET status = 'done' WHERE id = ? AND user_id = ?").bind(id.data, userId),
    c.env.DB.prepare(
      "INSERT INTO entries (id, user_id, date, category, amount, payment_type, note, client_id) VALUES (?, ?, ?, ?, ?, 'Mobile Money', ?, ?)",
    ).bind(entryId, userId, row.date, row.category, row.amount, row.name, clientId),
  ]);
  return c.json({ entryId });
});

app.post("/api/planned/:id/tomorrow", async (c) => {
  const userId = c.get("userId");
  const id = idParam.safeParse(c.req.param("id"));
  const body = z.object({ date: dateISO }).safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) return c.json({ error: "invalid" }, 400);
  await c.env.DB.prepare("UPDATE planned SET date = ? WHERE id = ? AND user_id = ? AND status = 'planned'")
    .bind(body.data.date, id.data, userId).run();
  return c.json({ ok: true });
});

app.delete("/api/planned/:id", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "invalid" }, 400);
  await c.env.DB.prepare("DELETE FROM planned WHERE id = ? AND user_id = ?").bind(id.data, c.get("userId")).run();
  return c.json({ ok: true });
});

const goalSchema = z.object({ name: z.string().trim().min(1).max(80), target: z.number().int().positive().max(100_000_000), dueDate: dateISO.nullable() });

app.post("/api/goals", async (c) => {
  const userId = c.get("userId");
  const body = goalSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO goals (id, user_id, name, target, due_date) VALUES (?, ?, ?, ?, ?)")
    .bind(id, userId, body.data.name, body.data.target, body.data.dueDate).run();
  return c.json({ id });
});

app.post("/api/goals/:id/contribute", async (c) => {
  const userId = c.get("userId");
  const id = idParam.safeParse(c.req.param("id"));
  const body = z.object({ amount: z.number().int().positive().max(100_000_000), date: dateISO }).safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) return c.json({ error: "invalid" }, 400);
  const goal = await c.env.DB.prepare("SELECT id FROM goals WHERE id = ? AND user_id = ?").bind(id.data, userId).first();
  if (!goal) return c.json({ error: "not_found" }, 404);
  await c.env.DB.prepare("INSERT INTO goal_contributions (id, user_id, goal_id, amount, date) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, id.data, body.data.amount, body.data.date).run();
  return c.json({ ok: true });
});

app.delete("/api/goals/:id", async (c) => {
  const userId = c.get("userId");
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "invalid" }, 400);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM goal_contributions WHERE goal_id = ? AND user_id = ?").bind(id.data, userId),
    c.env.DB.prepare("DELETE FROM goals WHERE id = ? AND user_id = ?").bind(id.data, userId),
  ]);
  return c.json({ ok: true });
});

const wishSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.number().int().positive().max(100_000_000),
  source: z.enum(["Jumia", "Instagram", "Shein", "Other"]),
  link: z.string().max(300).default(""),
  priority: z.enum(["Need", "Want", "Treat"]),
  unlockDate: dateISO.nullable(),
});

app.post("/api/wishes", async (c) => {
  const userId = c.get("userId");
  const body = wishSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const id = crypto.randomUUID();
  const data = body.data;
  await c.env.DB.prepare(
    "INSERT INTO wishes (id, user_id, name, price, source, link, priority, unlock_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')",
  ).bind(id, userId, data.name, data.price, data.source, data.link, data.priority, data.unlockDate).run();
  return c.json({ id });
});

app.post("/api/wishes/:id/wait", async (c) => {
  const userId = c.get("userId");
  const id = idParam.safeParse(c.req.param("id"));
  const body = z.object({ waitUntil: z.string().datetime() }).safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) return c.json({ error: "invalid" }, 400);
  await c.env.DB.prepare("UPDATE wishes SET status = 'waiting', wait_until = ? WHERE id = ? AND user_id = ? AND priority IN ('Want', 'Treat')")
    .bind(body.data.waitUntil, id.data, userId).run();
  return c.json({ ok: true });
});

app.post("/api/wishes/:id/bought", async (c) => {
  const userId = c.get("userId");
  const id = idParam.safeParse(c.req.param("id"));
  const body = z.object({ date: dateISO }).safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) return c.json({ error: "invalid" }, 400);
  const wish = await c.env.DB.prepare("SELECT name, price, status FROM wishes WHERE id = ? AND user_id = ?").bind(id.data, userId).first<{
    name: string; price: number; status: string;
  }>();
  if (!wish || wish.status === "bought") return c.json({ error: "not_found" }, 404);
  const clientId = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE wishes SET status = 'bought' WHERE id = ? AND user_id = ?").bind(id.data, userId),
    c.env.DB.prepare(
      "INSERT INTO entries (id, user_id, date, category, amount, payment_type, note, client_id) VALUES (?, ?, ?, 'Other', ?, 'Mobile Money', ?, ?)",
    ).bind(crypto.randomUUID(), userId, body.data.date, wish.price, wish.name, clientId),
  ]);
  return c.json({ ok: true });
});

app.delete("/api/wishes/:id", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "invalid" }, 400);
  await c.env.DB.prepare("UPDATE wishes SET status = 'removed' WHERE id = ? AND user_id = ?").bind(id.data, c.get("userId")).run();
  return c.json({ ok: true });
});

const debtSchema = z.object({
  person: z.string().trim().min(1).max(80),
  direction: z.enum(["owe", "owed"]),
  total: z.number().int().positive().max(100_000_000),
  installments: z.number().int().min(1).max(60),
  frequency: z.enum(["weekly", "monthly"]),
  firstDueDate: dateISO,
});

app.post("/api/debts", async (c) => {
  const userId = c.get("userId");
  const body = debtSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const data = body.data;
  const debtId = crypto.randomUUID();
  const schedule = debtSchedule(data);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO debts (id, user_id, person, direction, total, installments, frequency, first_due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(debtId, userId, data.person, data.direction, data.total, data.installments, data.frequency, data.firstDueDate),
    ...schedule.map((item) =>
      c.env.DB.prepare("INSERT INTO debt_payments (id, user_id, debt_id, due_date, amount) VALUES (?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), userId, debtId, item.dueDate, item.amount),
    ),
  ]);
  return c.json({ id: debtId });
});

app.post("/api/debts/:id/pay", async (c) => {
  const userId = c.get("userId");
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "invalid" }, 400);
  const next = await c.env.DB.prepare(
    "SELECT id FROM debt_payments WHERE debt_id = ? AND user_id = ? AND paid_at IS NULL ORDER BY due_date LIMIT 1",
  ).bind(id.data, userId).first<{ id: string }>();
  if (!next) return c.json({ error: "not_found" }, 404);
  await c.env.DB.prepare("UPDATE debt_payments SET paid_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND user_id = ?")
    .bind(next.id, userId).run();
  return c.json({ ok: true });
});

app.delete("/api/debts/:id", async (c) => {
  const userId = c.get("userId");
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "invalid" }, 400);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM debt_payments WHERE debt_id = ? AND user_id = ?").bind(id.data, userId),
    c.env.DB.prepare("DELETE FROM debts WHERE id = ? AND user_id = ?").bind(id.data, userId),
  ]);
  return c.json({ ok: true });
});

app.put("/api/reminders", async (c) => {
  const userId = c.get("userId");
  const body = z.object({
    items: z.array(z.object({
      key: z.enum(["nightly", "planned", "payday", "missed", "weekly"]),
      enabled: z.boolean(),
      timeChoice: z.string().regex(/^\d{2}:\d{2}$/),
    })).max(8),
  }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  for (const item of body.data.items) {
    await c.env.DB.prepare(
      `INSERT INTO reminder_settings (id, user_id, key, enabled, time_choice) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, key) DO UPDATE SET enabled = excluded.enabled, time_choice = excluded.time_choice`,
    ).bind(crypto.randomUUID(), userId, item.key, item.enabled ? 1 : 0, item.timeChoice).run();
  }
  return c.json({ ok: true });
});

/* Income sources and events ------------------------------------------------- */

app.post("/api/income-sources", async (c) => {
  const body = z.object({
    name: z.string().trim().min(1).max(80),
    type: sourceType,
    frequency: z.enum(["monthly", "weekly"]).nullable(),
    paydayDay: z.number().int().min(1).max(31).nullable(),
    typicalAmount: money,
  }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const id = crypto.randomUUID();
  const d = body.data;
  await c.env.DB.prepare(`INSERT INTO income_sources (id, user_id, name, type, frequency, payday_day, typical_amount, is_primary)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)`)
    .bind(id, c.get("userId"), d.name, d.type, d.frequency, d.paydayDay, d.typicalAmount).run();
  return c.json({ id });
});

app.patch("/api/income-sources/:id", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  const body = z.object({
    name: z.string().trim().min(1).max(80),
    type: sourceType,
    frequency: z.enum(["monthly", "weekly"]).nullable(),
    paydayDay: z.number().int().min(1).max(31).nullable(),
    typicalAmount: money,
  }).safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) return c.json({ error: "invalid" }, 400);
  const d = body.data;
  await c.env.DB.prepare(`UPDATE income_sources SET name = ?, type = ?, frequency = ?, payday_day = ?, typical_amount = ?
    WHERE id = ? AND user_id = ?`)
    .bind(d.name, d.type, d.frequency, d.paydayDay, d.typicalAmount, id.data, c.get("userId")).run();
  return c.json({ ok: true });
});

app.delete("/api/income-sources/:id", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "invalid" }, 400);
  await c.env.DB.prepare("DELETE FROM income_sources WHERE id = ? AND user_id = ? AND is_primary = 0")
    .bind(id.data, c.get("userId")).run();
  return c.json({ ok: true });
});

app.post("/api/income-events", async (c) => {
  const userId = c.get("userId");
  const body = z.object({
    sourceId: idParam,
    amount: money,
    date: dateISO,
    note: z.string().max(280).default(""),
    status: z.enum(["received", "expected"]),
  }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const owns = await c.env.DB.prepare("SELECT id FROM income_sources WHERE id = ? AND user_id = ?")
    .bind(body.data.sourceId, userId).first();
  if (!owns) return c.json({ error: "invalid" }, 400);
  const id = crypto.randomUUID();
  const d = body.data;
  await c.env.DB.prepare(`INSERT INTO income_events (id, user_id, source_id, amount, date, note, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, userId, d.sourceId, d.amount, d.date, d.note, d.status).run();
  return c.json({ id });
});

app.delete("/api/income-events/:id", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "invalid" }, 400);
  await c.env.DB.prepare("DELETE FROM income_events WHERE id = ? AND user_id = ?").bind(id.data, c.get("userId")).run();
  return c.json({ ok: true });
});

/* Balance corrections and period rollover ---------------------------------- */

app.post("/api/balance-adjustments", async (c) => {
  const userId = c.get("userId");
  const body = z.object({
    amount: z.number().int().min(-100_000_000).max(100_000_000),
    note: z.string().max(280).default(""),
    date: dateISO,
  }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const period = await ensureActivePeriod(c.env.DB, userId);
  if (!period) return c.json({ error: "setup_required" }, 400);
  const d = body.data;
  await c.env.DB.prepare(`INSERT INTO balance_adjustments (id, user_id, period_id, amount, note, date)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), userId, period.id, d.amount, d.note, d.date).run();
  return c.json({ ok: true });
});

app.post("/api/periods/:id/confirm-balance", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "invalid" }, 400);
  await c.env.DB.prepare("UPDATE periods SET balance_confirmed_at = ? WHERE id = ? AND user_id = ?")
    .bind(new Date().toISOString(), id.data, c.get("userId")).run();
  return c.json({ ok: true });
});

app.post("/api/salary-received", async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;
  const body = z.object({
    sourceId: idParam,
    amount: money,
    date: dateISO,
  }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid" }, 400);
  const owns = await db.prepare("SELECT id FROM income_sources WHERE id = ? AND user_id = ? AND is_primary = 1")
    .bind(body.data.sourceId, userId).first();
  if (!owns) return c.json({ error: "invalid" }, 400);

  const user = await db.prepare("SELECT payday_day, rolling_horizon_days, income_mode FROM users WHERE id = ?")
    .bind(userId).first<{ payday_day: number; rolling_horizon_days: number; income_mode: string }>();
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const stamp = new Date().toISOString();
  const active = await ensureActivePeriod(db, userId);
  if (!active) return c.json({ error: "setup_required" }, 400);

  if (active.start_date === body.data.date) {
    // The automatic rollover already opened this period this morning.
    await db.prepare(`INSERT INTO income_events (id, user_id, source_id, amount, date, note, status)
      VALUES (?, ?, ?, ?, ?, '', 'received')`)
      .bind(crypto.randomUUID(), userId, body.data.sourceId, body.data.amount, body.data.date).run();
    await db.prepare("UPDATE periods SET salary_confirmed_at = ?, balance_confirmed_at = ? WHERE id = ? AND user_id = ?")
      .bind(stamp, stamp, active.id, userId).run();
  } else {
    const carry = await balanceInPeriod(db, userId, active);
    const horizon = user.income_mode === "variable" ? Number(user.rolling_horizon_days ?? 30) : 0;
    const start = body.data.date;
    const end = periodEndFor(start, Number(user.payday_day ?? 25), horizon);
    const nextId = crypto.randomUUID();
    await db.prepare("UPDATE periods SET closed_at = ?, salary_confirmed_at = ? WHERE id = ? AND user_id = ?")
      .bind(stamp, stamp, active.id, userId).run();
    await db.prepare(`INSERT INTO periods (id, user_id, start_date, end_date, starting_balance, horizon_days, closed_at, salary_confirmed_at, balance_confirmed_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`)
      .bind(nextId, userId, start, end, carry, horizon, stamp, stamp).run();
    await db.prepare(`INSERT INTO income_events (id, user_id, source_id, amount, date, note, status)
      VALUES (?, ?, ?, ?, ?, '', 'received')`)
      .bind(crypto.randomUUID(), userId, body.data.sourceId, body.data.amount, start).run();
  }
  await db.prepare("UPDATE income_sources SET typical_amount = ? WHERE id = ? AND user_id = ?")
    .bind(body.data.amount, body.data.sourceId, userId).run();
  return c.json({ ok: true });
});

app.get("/api/stats", async (c) => {
  const userId = c.get("userId");
  const from = dateISO.safeParse(c.req.query("from"));
  const to = dateISO.safeParse(c.req.query("to"));
  if (!from.success || !to.success) return c.json({ error: "invalid" }, 400);
  const entries = await c.env.DB.prepare(
    "SELECT date, category, amount FROM entries WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date",
  ).bind(userId, from.data, to.data).all();
  const planned = await c.env.DB.prepare(
    "SELECT date, category, amount, status FROM planned WHERE user_id = ? AND date >= ? AND date <= ?",
  ).bind(userId, from.data, to.data).all();
  return c.json({ entries: entries.results, planned: planned.results });
});

app.get("/api/export", async (c) => {
  const bootstrap = await c.env.DB.prepare("SELECT id, name, payday_day, nightly_time, timezone, locale, theme, onboarded, created_at FROM users WHERE id = ?")
    .bind(c.get("userId")).first();
  const tables = ["month_plans", "fixed_costs", "entries", "day_logs", "planned", "wishes", "goals", "goal_contributions", "debts", "debt_payments", "reminder_settings", "periods", "income_sources", "income_events", "balance_adjustments"];
  const data: Record<string, unknown> = { user: bootstrap };
  for (const table of tables) {
    const rows = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE user_id = ?`).bind(c.get("userId")).all();
    data[table] = rows.results;
  }
  const format = c.req.query("format");
  if (format === "csv") {
    const entries = (data.entries as Record<string, unknown>[]) ?? [];
    const header = "date,category,amount,payment_type,note";
    const lines = entries.map((row) => [row.date, row.category, row.amount, row.payment_type, csv(String(row.note ?? ""))].join(","));
    return c.text([header, ...lines].join("\n"), 200, { "content-type": "text/csv; charset=utf-8" });
  }
  return c.json(data);
});

app.delete("/api/account", async (c) => {
  const userId = c.get("userId");
  const tables = ["balance_adjustments", "income_events", "income_sources", "periods", "reminder_settings", "debt_payments", "debts", "goal_contributions", "goals", "wishes", "planned", "day_logs", "entries", "fixed_costs", "month_plans", "users"];
  await c.env.DB.batch(tables.map((table) => {
    const column = table === "users" ? "id" : "user_id";
    return c.env.DB.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).bind(userId);
  }));
  if (c.env.CLERK_SECRET_KEY) {
    const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });
    await clerk.users.deleteUser(userId);
  }
  return c.json({ ok: true });
});

app.onError(() => {
  return new Response(JSON.stringify({ error: "server" }), { status: 500, headers: { "content-type": "application/json" } });
});

export default app;

async function ensureUser(c: { env: Env; executionCtx: { waitUntil(promise: Promise<unknown>): void } }, userId: string) {
  const columns = "id, name, payday_day, payday_day_end, nightly_time, timezone, locale, theme, onboarded, income_mode, rolling_horizon_days, fixed_cost_dismissed, created_at";
  const existing = await c.env.DB.prepare(
    `SELECT ${columns} FROM users WHERE id = ?`,
  ).bind(userId).first();
  if (existing) return existing;
  await c.env.DB.prepare("INSERT INTO users (id, name, timezone) VALUES (?, '', 'Africa/Douala')").bind(userId).run();
  c.executionCtx.waitUntil(sendWelcome(c.env, userId));
  return c.env.DB.prepare(`SELECT ${columns} FROM users WHERE id = ?`).bind(userId).first();
}

async function sendWelcome(env: Env, userId: string) {
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL || !env.CLERK_SECRET_KEY) return;
  try {
    const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
    const person = await clerk.users.getUser(userId);
    const email = person.emailAddresses[0]?.emailAddress;
    if (!email) return;
    const first = person.firstName?.trim() || "";
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL, name: "Spendly" },
        to: [{ email }],
        subject: "Bienvenue sur Spendly",
        htmlContent: `<p>Bonjour${first ? ` ${escapeHtml(first)}` : ""},</p><p>Spendly est prêt. Ce soir, trois taps suffisent pour noter la journée et voir ce que tu peux encore dépenser.</p><p>À tout à l'heure.</p>`,
      }),
    });
  } catch {
    // Welcome mail must never block sign-in.
  }
}

function csv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
