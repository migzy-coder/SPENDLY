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
import { debtSchedule } from "./money";
import type {
  Bootstrap,
  DebtPayload,
  Entry,
  EntryPayload,
  GoalPayload,
  PlanPayload,
  PlannedPayload,
  ProfilePayload,
  ReminderItem,
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
      created_at: now(),
    };
  }
  return state.user;
}

export async function localBootstrap(): Promise<Bootstrap> {
  const state = await readState();
  ensureUser(state);
  await writeState(state);
  return state;
}

export async function localSetup(payload: SetupPayload): Promise<void> {
  const state = await readState();
  const user = ensureUser(state);
  user.name = payload.name;
  user.payday_day = payload.paydayDay;
  user.nightly_time = payload.nightlyTime;
  user.locale = payload.locale;
  user.onboarded = 1;
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
  for (const cost of payload.fixedCosts) {
    state.fixedCosts.push({
      id: uid(),
      user_id: LOCAL_USER_ID,
      name: cost.name,
      amount: cost.amount,
      recurring: 1,
      created_at: now(),
    });
  }
  if (payload.goal) {
    state.goals.push({
      id: uid(),
      user_id: LOCAL_USER_ID,
      name: payload.goal.name,
      target: payload.goal.target,
      due_date: payload.goal.dueDate,
      created_at: now(),
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
  user.nightly_time = payload.nightlyTime;
  user.locale = payload.locale;
  user.theme = payload.theme;
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
