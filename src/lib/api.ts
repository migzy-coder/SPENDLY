/**
 * The single place where the app talks to its data.
 *
 * Two transports exist behind one interface:
 *  - "remote": the Hono Worker on Cloudflare, authenticated with a Clerk token;
 *  - "local":  IndexedDB on the device, used in demo mode and offline.
 *
 * In remote mode a write that fails because the network is gone is pushed to
 * an IndexedDB queue and replayed later, so the UI never loses a spending.
 */

import * as local from "./localdb";
import type {
  Bootstrap,
  DebtPayload,
  EntryPayload,
  GoalPayload,
  PlanPayload,
  PlannedPayload,
  ProfilePayload,
  ReminderItem,
  SetupPayload,
  WishPayload,
} from "./types";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type Api = {
  mode: "remote" | "local";
  getBootstrap(): Promise<Bootstrap>;
  setup(payload: SetupPayload): Promise<void>;
  savePlan(payload: PlanPayload): Promise<void>;
  saveProfile(payload: ProfilePayload): Promise<void>;
  createEntry(payload: EntryPayload): Promise<{ id: string }>;
  updateEntry(id: string, payload: Omit<EntryPayload, "clientId">): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  logDay(date: string, spentNothing: boolean): Promise<void>;
  createPlanned(payload: PlannedPayload): Promise<{ id: string }>;
  completePlanned(id: string): Promise<void>;
  postponePlanned(id: string, date: string): Promise<void>;
  deletePlanned(id: string): Promise<void>;
  createGoal(payload: GoalPayload): Promise<{ id: string }>;
  contributeGoal(id: string, amount: number, date: string): Promise<void>;
  deleteGoal(id: string): Promise<void>;
  createWish(payload: WishPayload): Promise<{ id: string }>;
  waitWish(id: string, waitUntil: string): Promise<void>;
  buyWish(id: string, date: string): Promise<void>;
  deleteWish(id: string): Promise<void>;
  createDebt(payload: DebtPayload): Promise<{ id: string }>;
  payDebt(id: string): Promise<void>;
  deleteDebt(id: string): Promise<void>;
  saveReminders(items: ReminderItem[]): Promise<void>;
  getStats(from: string, to: string): Promise<{ entries: unknown[]; planned: unknown[] }>;
  exportData(format: "json" | "csv"): Promise<string>;
  deleteAccount(): Promise<void>;
};

export type TokenProvider = () => Promise<string | null>;

const pendingListeners = new Set<(count: number) => void>();

export function onPendingChange(listener: (count: number) => void): () => void {
  pendingListeners.add(listener);
  void local.pendingWriteCount().then(listener);
  return () => pendingListeners.delete(listener);
}

async function announcePending(): Promise<void> {
  const count = await local.pendingWriteCount();
  for (const listener of pendingListeners) listener(count);
}

export async function flushQueue(getToken: TokenProvider): Promise<void> {
  const pending = await local.queuedWrites();
  for (const write of pending) {
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(write.path, {
        method: write.method,
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(write.body ?? {}),
      });
      if (!response.ok) return;
      await local.removeQueuedWrite(write.id as number);
      await announcePending();
    } catch {
      return;
    }
  }
}

/* Remote transport --------------------------------------------------------- */

function createRemoteApi(getToken: TokenProvider): Api {
  async function send<T>(path: string, init: RequestInit = {}, queueOnFailure = true): Promise<T> {
    const token = await getToken();
    if (!token) throw new ApiError("unauthorized", 401);
    try {
      const response = await fetch(path, {
        ...init,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
          ...(init.headers ?? {}),
        },
      });
      if (!response.ok) {
        throw new ApiError(`request failed (${response.status})`, response.status);
      }
      if (response.status === 204) return undefined as T;
      const text = await response.text();
      return (text ? JSON.parse(text) : undefined) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (queueOnFailure && init.method && init.method !== "GET") {
        await local.queueWrite({
          path,
          method: init.method,
          body: init.body ? JSON.parse(String(init.body)) : {},
        });
        await announcePending();
        return undefined as T;
      }
      throw new ApiError("network", 0);
    }
  }

  const json = (body: unknown) => JSON.stringify(body);

  return {
    mode: "remote",
    getBootstrap: () => send<Bootstrap>("/api/bootstrap", { method: "GET" }, false),
    setup: (payload) => send<void>("/api/setup", { method: "POST", body: json(payload) }),
    savePlan: (payload) => send<void>("/api/plan", { method: "PUT", body: json(payload) }),
    saveProfile: (payload) => send<void>("/api/profile", { method: "PATCH", body: json(payload) }),
    createEntry: (payload) => send<{ id: string }>("/api/entries", { method: "POST", body: json(payload) }),
    updateEntry: (id, payload) =>
      send<void>(`/api/entries/${id}`, { method: "PATCH", body: json(payload) }),
    deleteEntry: (id) => send<void>(`/api/entries/${id}`, { method: "DELETE" }),
    logDay: (date, spentNothing) =>
      send<void>("/api/day-logs", { method: "POST", body: json({ date, spentNothing }) }),
    createPlanned: (payload) => send<{ id: string }>("/api/planned", { method: "POST", body: json(payload) }),
    completePlanned: (id) => send<void>(`/api/planned/${id}/done`, { method: "POST", body: "{}" }),
    postponePlanned: (id, date) => send<void>(`/api/planned/${id}/tomorrow`, { method: "POST", body: json({ date }) }),
    deletePlanned: (id) => send<void>(`/api/planned/${id}`, { method: "DELETE" }),
    createGoal: (payload) => send<{ id: string }>("/api/goals", { method: "POST", body: json(payload) }),
    contributeGoal: (id, amount, date) =>
      send<void>(`/api/goals/${id}/contribute`, { method: "POST", body: json({ amount, date }) }),
    deleteGoal: (id) => send<void>(`/api/goals/${id}`, { method: "DELETE" }),
    createWish: (payload) => send<{ id: string }>("/api/wishes", { method: "POST", body: json(payload) }),
    waitWish: (id, waitUntil) => send<void>(`/api/wishes/${id}/wait`, { method: "POST", body: json({ waitUntil }) }),
    buyWish: (id, date) => send<void>(`/api/wishes/${id}/bought`, { method: "POST", body: json({ date }) }),
    deleteWish: (id) => send<void>(`/api/wishes/${id}`, { method: "DELETE" }),
    createDebt: (payload) => send<{ id: string }>("/api/debts", { method: "POST", body: json(payload) }),
    payDebt: (id) => send<void>(`/api/debts/${id}/pay`, { method: "POST", body: "{}" }),
    deleteDebt: (id) => send<void>(`/api/debts/${id}`, { method: "DELETE" }),
    saveReminders: (items) => send<void>("/api/reminders", { method: "PUT", body: json({ items }) }),
    getStats: (from, to) =>
      send<{ entries: unknown[]; planned: unknown[] }>(
        `/api/stats?from=${from}&to=${to}`,
        { method: "GET" },
        false,
      ),
    exportData: async (format) => {
      const token = await getToken();
      const response = await fetch(`/api/export?format=${format}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new ApiError("export failed", response.status);
      return response.text();
    },
    deleteAccount: () => send<void>("/api/account", { method: "DELETE" }),
  };
}

/* Local transport ---------------------------------------------------------- */

function createLocalApi(): Api {
  return {
    mode: "local",
    getBootstrap: local.localBootstrap,
    setup: local.localSetup,
    savePlan: local.localSavePlan,
    saveProfile: local.localSaveProfile,
    createEntry: local.localCreateEntry,
    updateEntry: local.localUpdateEntry,
    deleteEntry: local.localDeleteEntry,
    logDay: local.localLogDay,
    createPlanned: local.localCreatePlanned,
    completePlanned: local.localCompletePlanned,
    postponePlanned: local.localPostponePlanned,
    deletePlanned: local.localDeletePlanned,
    createGoal: local.localCreateGoal,
    contributeGoal: local.localContributeGoal,
    deleteGoal: local.localDeleteGoal,
    createWish: local.localCreateWish,
    waitWish: local.localWaitWish,
    buyWish: local.localBuyWish,
    deleteWish: local.localDeleteWish,
    createDebt: local.localCreateDebt,
    payDebt: local.localPayDebt,
    deleteDebt: local.localDeleteDebt,
    saveReminders: local.localSaveReminders,
    getStats: async (from, to) => {
      const state = await local.localBootstrap();
      return {
        entries: state.entries.filter((entry) => entry.date >= from && entry.date <= to),
        planned: state.planned.filter((item) => item.date >= from && item.date <= to),
      };
    },
    exportData: (format) => local.localExport(format),
    deleteAccount: local.localDeleteAccount,
  };
}

export function createApi(getToken: TokenProvider | null): Api {
  return getToken ? createRemoteApi(getToken) : createLocalApi();
}
