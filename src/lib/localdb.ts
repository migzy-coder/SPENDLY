/**
 * A complete local implementation of the Spendly API, stored in IndexedDB.
 *
 * It is used in two situations:
 *  - demo mode, when Clerk is not configured yet, so the app can be used and
 *    reviewed without any account;
 *  - offline mode, where the queue in the same database keeps the writes that
 *    still have to reach the server.
 */

import { openDB } from "idb";
import type { IDBPDatabase } from "idb";
import { addDays, debtSchedule, periodEndFor, todayISO } from "./money";
import type {
  BalanceAdjustmentPayload,
  Bootstrap,
  DebtPayload,
  Entry,
  EntryPayload,
  FixedCostPayload,
  GoalPayload,
  IncomeEventPayload,
  IncomeSourcePayload,
  Period,
  PlanPayload,
  PlannedPayload,
  ProfilePayload,
  ReminderItem,
  SalaryPayload,
  SetupPayload,
  WishPayload,
} from "./types";

const LOCAL_USER_ID = "local-user";
const DB_NAME = "spendly";
const DB_VERSION = 1;

export type QueuedWrite = {
  id?: number;
  path: string;
  method: string;
  body: unknown;
  createdAt: number;
};

type Db = IDBPDatabase<{
  kv: { key: string; value: unknown };
  queue: { key: number; value: QueuedWrite; indexes: { byCreatedAt: number } };
}>;

let dbPromise: Promise<Db> | null = null;

function db(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("kv")) database.createObjectStore("kv");
        if (!database.objectStoreNames.contains("queue")) {
          const store = database.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
          store.createIndex("byCreatedAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}

function now(): string {
  return new Date().toISOString();
}

function uid(): string {
  return crypto.randomUUID();
}

function emptyState(): Bootstrap {
  return {
    user: null,
    plans: [],
    fixedCosts: [],
    entries: [],
    dayLogs: [],
    planned: [],
    goals: [],
    contributions: [],
    wishes: [],
    debts: [],
    payments: [],
    reminders: [],
    periods: [],
    incomeSources: [],
    incomeEvents: [],
    adjustments: [],
  };
}

async function readState(): Promise<Bootstrap> {
  const database = await db();
  const state = await database.get("kv", "state");
  return (state as Bootstrap | undefined) ?? emptyState();
}

async function writeState(state: Bootstrap): Promise<void> {
  const database = await db();
  await database.put("kv", state, "state");
}

function ensureUser(state: Bootstrap) {
  if (!state.user) {
    state.user = {
      id: LOCAL_USER_ID,
      name: "",
      payday_day: 25,
      nightly_time: "21:00",
      timezone: "Africa/Douala",
      locale: "fr",
      theme: "light",
      onboarded: 0,
      income_mode: "salary",
      rolling_horizon_days: 30,
      fixed_cost_dismissed: 0,
      created_at: now(),
    };
  }
  return state.user;
}

function activeLocalPeriod(state: Bootstrap, today: string): Period | null {
  const open = state.periods.find((p) => p.start_date <= today && p.end_date >= today && !p.closed_at);
  if (open) return open;
  const last = [...state.periods].sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
  return last ?? null;
}

function localBalance(state: Bootstrap, period: Period): number {
  const inPeriod = (date: string) => date >= period.start_date && date <= period.end_date;
  return Math.trunc(
    period.starting_balance +
      state.incomeEvents.filter((e) => e.status === "received" && inPeriod(e.date)).reduce((sum, e) => sum + e.amount, 0) -
      state.entries.filter((e) => inPeriod(e.date)).reduce((sum, e) => sum + e.amount, 0) +
      state.adjustments.filter((a) => a.period_id === period.id).reduce((sum, a) => sum + a.amount, 0),
  );
}

function newLocalPeriod(start: string, end: string, balance: number, horizon: number, salary = false): Period {
  const stamp = now();
  return {
    id: uid(),
    user_id: LOCAL_USER_ID,
    start_date: start,
    end_date: end,
    starting_balance: balance,
    horizon_days: horizon,
    closed_at: null,
    salary_confirmed_at: salary ? stamp : null,
    balance_confirmed_at: salary ? stamp : null,
    created_at: stamp,
  };
}

export async function localBootstrap(): Promise<Bootstrap> {
  const state = await readState();
  const user = ensureUser(state);
  const today = todayISO();
  if (user.onboarded === 1 && !activeLocalPeriod(state, today)) {
    const last = [...state.periods].sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
    const carry = last ? localBalance(state, last) : 0;
    const horizon = user.income_mode === "variable" ? user.rolling_horizon_days : 0;
    state.periods.push(newLocalPeriod(today, periodEndFor(today, user.payday_day, horizon), carry, horizon));
  }
  await writeState(state);
  return state;
}

export async function localSetup(payload: SetupPayload): Promise<void> {
  const state = await readState();
  const user = ensureUser(state);
  const today = todayISO();
  user.name = payload.name;
  user.payday_day = payload.paydayDay;
  user.payday_day_end = payload.paydayDayEnd ?? payload.paydayDay;
  user.nightly_time = payload.nightlyTime;
  user.locale = payload.locale;
  user.income_mode = payload.incomeMode;
  user.rolling_horizon_days = payload.horizonDays;
  user.onboarded = 1;

  const end = payload.incomeMode === "variable" && payload.nextIncomeDate
    ? addDays(payload.nextIncomeDate, -1)
    : periodEndFor(today, payload.paydayDay, payload.incomeMode === "variable" ? payload.horizonDays : 0);
  state.periods = [newLocalPeriod(today, end, payload.balance, payload.horizonDays)];
  state.periods[0].balance_confirmed_at = now();

  state.incomeSources = [];
  if (payload.incomeMode === "salary" || payload.incomeMode === "both") {
    state.incomeSources.push({
      id: uid(), user_id: LOCAL_USER_ID, name: payload.locale === "fr" ? "Salaire" : "Salary",
      type: "salary", frequency: "monthly", payday_day: payload.paydayDay, typical_amount: 0, is_primary: 1, created_at: now(),
    });
  }
  if (payload.incomeMode === "variable" || payload.incomeMode === "both") {
    state.incomeSources.push({
      id: uid(), user_id: LOCAL_USER_ID, name: payload.locale === "fr" ? "Revenu variable" : "Side income",
      type: "side", frequency: null, payday_day: null, typical_amount: 0, is_primary: 0, created_at: now(),
    });
  }
  state.fixedCosts = payload.fixedCosts.map((cost) => ({
    id: uid(), user_id: LOCAL_USER_ID, name: cost.name, amount: cost.amount, recurring: 1,
    category: cost.category, frequency: cost.frequency, due_day: cost.dueDay, due_date: cost.dueDate, created_at: now(),
  }));
  for (const item of payload.bigPayments) {
    state.planned.push({
      id: uid(), user_id: LOCAL_USER_ID, name: item.name, date: item.date, category: "Other",
      amount: item.amount, status: "planned", created_at: now(),
    });
  }
  if (payload.goal) {
    state.goals.push({
      id: uid(), user_id: LOCAL_USER_ID, name: payload.goal.name, target: payload.goal.target,
      due_date: payload.goal.dueDate, created_at: now(),
    });
  }
  await writeState(state);
}

export async function localSavePlan(payload: PlanPayload): Promise<void> {
  const state = await readState();
  const plan = state.plans.find((item) => item.month === payload.month);
  if (plan) {
    plan.income = payload.income;
    plan.savings_target = payload.savingsTarget;
    plan.wishlist_budget = payload.wishlistBudget;
  } else {
    state.plans.push({
      id: uid(),
      user_id: LOCAL_USER_ID,
      month: payload.month,
      income: payload.income,
      savings_target: payload.savingsTarget,
      wishlist_budget: payload.wishlistBudget,
      created_at: now(),
    });
  }
  await writeState(state);
}

export async function localSaveProfile(payload: ProfilePayload): Promise<void> {
  const state = await readState();
  const user = ensureUser(state);
  user.name = payload.name;
  user.payday_day = payload.paydayDay;
  user.payday_day_end = payload.paydayDayEnd ?? payload.paydayDay;
  user.nightly_time = payload.nightlyTime;
  user.locale = payload.locale;
  user.theme = payload.theme;
  user.income_mode = payload.incomeMode ?? user.income_mode;
  user.rolling_horizon_days = payload.horizonDays ?? user.rolling_horizon_days;
  await writeState(state);
}

export async function localCreateIncomeSource(payload: IncomeSourcePayload): Promise<{ id: string }> {
  const state = await readState();
  const id = uid();
  state.incomeSources.push({
    id, user_id: LOCAL_USER_ID, name: payload.name, type: payload.type,
    frequency: payload.frequency, payday_day: payload.paydayDay,
    typical_amount: payload.typicalAmount, is_primary: 0, created_at: now(),
  });
  await writeState(state);
  return { id };
}

export async function localUpdateIncomeSource(id: string, payload: IncomeSourcePayload): Promise<void> {
  const state = await readState();
  const source = state.incomeSources.find((item) => item.id === id);
  if (source) {
    source.name = payload.name;
    source.type = payload.type;
    source.frequency = payload.frequency;
    source.payday_day = payload.paydayDay;
    source.typical_amount = payload.typicalAmount;
  }
  await writeState(state);
}

export async function localDeleteIncomeSource(id: string): Promise<void> {
  const state = await readState();
  state.incomeSources = state.incomeSources.filter((item) => item.id !== id || item.is_primary === 1);
  await writeState(state);
}

export async function localCreateIncomeEvent(payload: IncomeEventPayload): Promise<{ id: string }> {
  const state = await readState();
  const id = uid();
  state.incomeEvents.push({
    id, user_id: LOCAL_USER_ID, source_id: payload.sourceId, amount: payload.amount,
    date: payload.date, note: payload.note, status: payload.status, created_at: now(),
  });
  await writeState(state);
  return { id };
}

export async function localDeleteIncomeEvent(id: string): Promise<void> {
  const state = await readState();
  state.incomeEvents = state.incomeEvents.filter((item) => item.id !== id);
  await writeState(state);
}

export async function localUpdateBalance(payload: BalanceAdjustmentPayload): Promise<void> {
  const state = await readState();
  const today = todayISO();
  const period = activeLocalPeriod(state, today);
  if (period) {
    state.adjustments.push({
      id: uid(), user_id: LOCAL_USER_ID, period_id: period.id, amount: payload.amount,
      note: payload.note, date: payload.date, created_at: now(),
    });
  }
  await writeState(state);
}

export async function localConfirmBalance(periodId: string): Promise<void> {
  const state = await readState();
  const period = state.periods.find((item) => item.id === periodId);
  if (period) period.balance_confirmed_at = now();
  await writeState(state);
}

export async function localConfirmSalary(payload: SalaryPayload): Promise<void> {
  const state = await readState();
  const today = todayISO();
  const user = ensureUser(state);
  const active = activeLocalPeriod(state, today);
  if (!active) return;
  const horizon = user.income_mode === "variable" ? user.rolling_horizon_days : 0;
  if (active.start_date === payload.date) {
    state.incomeEvents.push({
      id: uid(), user_id: LOCAL_USER_ID, source_id: payload.sourceId, amount: payload.amount,
      date: payload.date, note: "", status: "received", created_at: now(),
    });
    active.salary_confirmed_at = now();
    active.balance_confirmed_at = now();
  } else {
    const carry = localBalance(state, active);
    active.closed_at = now();
    active.salary_confirmed_at = now();
    const next = newLocalPeriod(
      payload.date, periodEndFor(payload.date, user.payday_day, horizon), carry, horizon, true,
    );
    state.periods.push(next);
    state.incomeEvents.push({
      id: uid(), user_id: LOCAL_USER_ID, source_id: payload.sourceId, amount: payload.amount,
      date: payload.date, note: "", status: "received", created_at: now(),
    });
  }
  const source = state.incomeSources.find((item) => item.id === payload.sourceId);
  if (source) source.typical_amount = payload.amount;
  await writeState(state);
}

export async function localDismissFixedCostReminder(): Promise<void> {
  const state = await readState();
  ensureUser(state).fixed_cost_dismissed = 1;
  await writeState(state);
}

export async function localCreateFixedCost(payload: FixedCostPayload): Promise<{ id: string }> {
  const state = await readState();
  const id = uid();
  state.fixedCosts.push({
    id, user_id: LOCAL_USER_ID, name: payload.name, amount: payload.amount, recurring: 1,
    category: payload.category, frequency: payload.frequency, due_day: payload.dueDay,
    due_date: payload.dueDate, created_at: now(),
  });
  await writeState(state);
  return { id };
}

export async function localUpdateFixedCost(id: string, payload: FixedCostPayload): Promise<void> {
  const state = await readState();
  const cost = state.fixedCosts.find((item) => item.id === id);
  if (cost) {
    cost.name = payload.name;
    cost.amount = payload.amount;
    cost.category = payload.category;
    cost.frequency = payload.frequency;
    cost.due_day = payload.dueDay;
    cost.due_date = payload.dueDate;
  }
  await writeState(state);
}

export async function localDeleteFixedCost(id: string): Promise<void> {
  const state = await readState();
  state.fixedCosts = state.fixedCosts.filter((item) => item.id !== id);
  await writeState(state);
}

export async function localCreateEntry(payload: EntryPayload): Promise<{ id: string }> {
  const state = await readState();
  const existing = state.entries.find((entry) => entry.client_id === payload.clientId);
  if (existing) return { id: existing.id };
  const entry: Entry = {
    id: uid(),
    user_id: LOCAL_USER_ID,
    date: payload.date,
    category: payload.category,
    amount: payload.amount,
    payment_type: payload.paymentType,
    note: payload.note,
    client_id: payload.clientId,
    created_at: now(),
  };
  state.entries.push(entry);
  await writeState(state);
  return { id: entry.id };
}

export async function localUpdateEntry(id: string, payload: Omit<EntryPayload, "clientId">): Promise<void> {
  const state = await readState();
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  entry.date = payload.date;
  entry.category = payload.category;
  entry.amount = payload.amount;
  entry.payment_type = payload.paymentType;
  entry.note = payload.note;
  await writeState(state);
}

export async function localDeleteEntry(id: string): Promise<void> {
  const state = await readState();
  state.entries = state.entries.filter((item) => item.id !== id);
  await writeState(state);
}

export async function localLogDay(date: string, spentNothing: boolean): Promise<void> {
  const state = await readState();
  const log = state.dayLogs.find((item) => item.date === date);
  if (log) {
    log.spent_nothing = spentNothing ? 1 : 0;
  } else {
    state.dayLogs.push({
      id: uid(),
      user_id: LOCAL_USER_ID,
      date,
      spent_nothing: spentNothing ? 1 : 0,
      created_at: now(),
    });
  }
  await writeState(state);
}

export async function localCreatePlanned(payload: PlannedPayload): Promise<{ id: string }> {
  const state = await readState();
  const id = uid();
  state.planned.push({
    id,
    user_id: LOCAL_USER_ID,
    name: payload.name,
    date: payload.date,
    category: payload.category,
    amount: payload.amount,
    status: "planned",
    created_at: now(),
  });
  await writeState(state);
  return { id };
}

export async function localCompletePlanned(id: string): Promise<void> {
  const state = await readState();
  const item = state.planned.find((row) => row.id === id);
  if (!item || item.status === "done") return;
  item.status = "done";
  state.entries.push({
    id: uid(),
    user_id: LOCAL_USER_ID,
    date: item.date,
    category: item.category,
    amount: item.amount,
    payment_type: "Mobile Money",
    note: item.name,
    client_id: uid(),
    created_at: now(),
  });
  await writeState(state);
}

export async function localPostponePlanned(id: string, date: string): Promise<void> {
  const state = await readState();
  const item = state.planned.find((row) => row.id === id);
  if (!item) return;
  item.date = date;
  await writeState(state);
}

export async function localDeletePlanned(id: string): Promise<void> {
  const state = await readState();
  state.planned = state.planned.filter((item) => item.id !== id);
  await writeState(state);
}

export async function localCreateGoal(payload: GoalPayload): Promise<{ id: string }> {
  const state = await readState();
  const id = uid();
  state.goals.push({
    id,
    user_id: LOCAL_USER_ID,
    name: payload.name,
    target: payload.target,
    due_date: payload.dueDate,
    created_at: now(),
  });
  await writeState(state);
  return { id };
}

export async function localContributeGoal(id: string, amount: number, date: string): Promise<void> {
  const state = await readState();
  if (!state.goals.some((goal) => goal.id === id)) return;
  state.contributions.push({
    id: uid(),
    user_id: LOCAL_USER_ID,
    goal_id: id,
    amount,
    date,
    created_at: now(),
  });
  await writeState(state);
}

export async function localDeleteGoal(id: string): Promise<void> {
  const state = await readState();
  state.goals = state.goals.filter((goal) => goal.id !== id);
  state.contributions = state.contributions.filter((item) => item.goal_id !== id);
  await writeState(state);
}

export async function localCreateWish(payload: WishPayload): Promise<{ id: string }> {
  const state = await readState();
  const id = uid();
  state.wishes.push({
    id,
    user_id: LOCAL_USER_ID,
    name: payload.name,
    price: payload.price,
    source: payload.source,
    link: payload.link,
    priority: payload.priority,
    unlock_date: payload.unlockDate,
    status: "active",
    wait_until: null,
    created_at: now(),
  });
  await writeState(state);
  return { id };
}

export async function localWaitWish(id: string, waitUntil: string): Promise<void> {
  const state = await readState();
  const wish = state.wishes.find((item) => item.id === id);
  if (!wish || (wish.priority !== "Want" && wish.priority !== "Treat")) return;
  wish.status = "waiting";
  wish.wait_until = waitUntil;
  await writeState(state);
}

export async function localBuyWish(id: string, date: string): Promise<void> {
  const state = await readState();
  const wish = state.wishes.find((item) => item.id === id);
  if (!wish || wish.status === "bought") return;
  wish.status = "bought";
  state.entries.push({
    id: uid(),
    user_id: LOCAL_USER_ID,
    date,
    category: "Other",
    amount: wish.price,
    payment_type: "Mobile Money",
    note: wish.name,
    client_id: uid(),
    created_at: now(),
  });
  await writeState(state);
}

export async function localDeleteWish(id: string): Promise<void> {
  const state = await readState();
  const wish = state.wishes.find((item) => item.id === id);
  if (!wish) return;
  wish.status = "removed";
  await writeState(state);
}

export async function localCreateDebt(payload: DebtPayload): Promise<{ id: string }> {
  const state = await readState();
  const id = uid();
  state.debts.push({
    id,
    user_id: LOCAL_USER_ID,
    person: payload.person,
    direction: payload.direction,
    total: payload.total,
    installments: payload.installments,
    frequency: payload.frequency,
    first_due_date: payload.firstDueDate,
    created_at: now(),
  });
  for (const item of debtSchedule(payload)) {
    state.payments.push({
      id: uid(),
      user_id: LOCAL_USER_ID,
      debt_id: id,
      due_date: item.dueDate,
      amount: item.amount,
      paid_at: null,
      created_at: now(),
    });
  }
  await writeState(state);
  return { id };
}

export async function localPayDebt(id: string): Promise<void> {
  const state = await readState();
  const next = state.payments
    .filter((payment) => payment.debt_id === id && payment.paid_at === null)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  if (!next) return;
  next.paid_at = now();
  await writeState(state);
}

export async function localDeleteDebt(id: string): Promise<void> {
  const state = await readState();
  state.debts = state.debts.filter((debt) => debt.id !== id);
  state.payments = state.payments.filter((payment) => payment.debt_id !== id);
  await writeState(state);
}

export async function localSaveReminders(items: ReminderItem[]): Promise<void> {
  const state = await readState();
  for (const item of items) {
    const existing = state.reminders.find((row) => row.key === item.key);
    if (existing) {
      existing.enabled = item.enabled ? 1 : 0;
      existing.time_choice = item.timeChoice;
    } else {
      state.reminders.push({
        id: uid(),
        user_id: LOCAL_USER_ID,
        key: item.key,
        enabled: item.enabled ? 1 : 0,
        time_choice: item.timeChoice,
        created_at: now(),
      });
    }
  }
  await writeState(state);
}

export async function localExport(format: "json" | "csv"): Promise<string> {
  const state = await readState();
  if (format === "csv") {
    const header = "date,category,amount,payment_type,note";
    const lines = state.entries.map((entry) =>
      [entry.date, entry.category, entry.amount, entry.payment_type, `"${entry.note.replaceAll('"', '""')}"`].join(","),
    );
    return [header, ...lines].join("\n");
  }
  return JSON.stringify(state, null, 2);
}

export async function localDeleteAccount(): Promise<void> {
  const database = await db();
  await database.clear("kv");
  await database.clear("queue");
}

/* Offline queue ------------------------------------------------------------ */

export async function queueWrite(write: Omit<QueuedWrite, "id" | "createdAt">): Promise<void> {
  const database = await db();
  await database.add("queue", { ...write, createdAt: Date.now() });
}

export async function queuedWrites(): Promise<QueuedWrite[]> {
  const database = await db();
  return database.getAllFromIndex("queue", "byCreatedAt");
}

export async function removeQueuedWrite(id: number): Promise<void> {
  const database = await db();
  await database.delete("queue", id);
}

export async function pendingWriteCount(): Promise<number> {
  const database = await db();
  return database.count("queue");
}
