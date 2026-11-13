import { useSyncExternalStore } from "react";

/**
 * Feature release flags. Code for all features stays in the app; flags control
 * what regular users see. Admin can release features from /admin.
 */
export type FeatureKey =
  | "plan"        // A: onboarding + plan (fundamental)
  | "quickLog"    // B: quick expense logging / Today logging
  | "stats"       // simple stats
  | "wishlist"    // wishlist & reminders
  | "activity"
  | "calendar"
  | "debts"
  | "simulator";

export type FeatureFlags = Record<FeatureKey, boolean>;

const STORAGE_KEY = "spendly.features.v1";
const ADMIN_KEY = "spendly.admin.ok";

// Fundamentals-only defaults (Option A)
export const DEFAULT_FLAGS: FeatureFlags = {
  plan: true,
  quickLog: false,
  stats: false,
  wishlist: false,
  activity: false,
  calendar: false,
  debts: false,
  simulator: false,
};

function readFlags(): FeatureFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FLAGS };
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return { ...DEFAULT_FLAGS, ...parsed };
  } catch {
    return { ...DEFAULT_FLAGS };
  }
}

let cache = readFlags();
const listeners = new Set<() => void>();

function emit() {
  cache = readFlags();
  for (const l of listeners) l();
}

export function getFeatureFlags(): FeatureFlags {
  return cache;
}

export function isFeatureEnabled(key: FeatureKey): boolean {
  return getFeatureFlags()[key];
}

export function setFeatureFlag(key: FeatureKey, value: boolean) {
  const next = { ...getFeatureFlags(), [key]: value };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}

export function setAllFeatureFlags(next: FeatureFlags) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_FLAGS, ...next }));
  emit();
}

export function resetFeatureFlags() {
  localStorage.removeItem(STORAGE_KEY);
  emit();
}

export function subscribeFeatures(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFeatures(): FeatureFlags {
  return useSyncExternalStore(subscribeFeatures, getFeatureFlags, () => DEFAULT_FLAGS);
}

export function useFeature(key: FeatureKey): boolean {
  return useFeatures()[key];
}

// Simple local admin gate (PIN stored locally; owner sets it in /admin)
export function isAdminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdminUnlocked(value: boolean) {
  try {
    if (value) sessionStorage.setItem(ADMIN_KEY, "1");
    else sessionStorage.removeItem(ADMIN_KEY);
  } catch {
    /* ignore */
  }
}

export function getAdminPin(): string | null {
  try {
    return localStorage.getItem("spendly.admin.pin");
  } catch {
    return null;
  }
}

export function setAdminPin(pin: string) {
  try {
    localStorage.setItem("spendly.admin.pin", pin);
  } catch {
    /* ignore */
  }
}
