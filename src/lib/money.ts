/** All amounts are whole XAF. Dates are Africa/Douala calendar dates, YYYY-MM-DD. */

export const TIMEZONE = "Africa/Douala";
export const DEFAULT_PAYDAY = 25;
export const CATEGORIES = ["Food", "Transport", "Airtime", "Clothes", "Social", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];
export const PAYMENT_TYPES = ["Cash", "Transfer", "Mobile Money"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];
export const AMOUNT_CHIPS = [500, 1000, 2000, 5000, 10000] as const;

export type MonthInputs = {
  income: number;
  fixedCosts: number;
  savings: number;
  debtPayments: number;
  wishlist: number;
  spent: number;
  plannedRemaining: number;
};

export type Verdict = "over" | "tight" | "fits";

export function whole(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.trunc(amount);
}

export function formatXaf(amount: number): string {
  const value = whole(amount);
  const sign = value < 0 ? "−" : "";
  const digits = Math.abs(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${sign}${digits}`;
}

export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7);
}

export function daysInMonth(dateISO: string): number {
  const year = Number(dateISO.slice(0, 4));
  const month = Number(dateISO.slice(5, 7));
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function daysRemaining(dateISO: string): number {
  const day = Number(dateISO.slice(8, 10));
  return Math.max(0, daysInMonth(dateISO) - day + 1);
}

export function addDays(dateISO: string, days: number): string {
  const year = Number(dateISO.slice(0, 4));
  const month = Number(dateISO.slice(5, 7));
  const day = Number(dateISO.slice(8, 10));
  const next = new Date(Date.UTC(year, month - 1, day + days));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function left(input: MonthInputs): number {
  return whole(input.income) - whole(input.fixedCosts) - whole(input.savings) - whole(input.debtPayments) - whole(input.wishlist);
}

export function leftToSpend(input: MonthInputs): number {
  return left(input) - whole(input.spent);
}

export function freeAmount(input: MonthInputs): number {
  return leftToSpend(input) - whole(input.plannedRemaining);
}

/** Round down to the nearest 100 XAF. Negative free money becomes 0. */
export function dailyAllowance(free: number, daysRemainingIncludingToday: number): number {
  if (daysRemainingIncludingToday <= 0) return 0;
  return Math.max(0, Math.floor(whole(free) / daysRemainingIncludingToday / 100) * 100);
}

/** Allowance as it stood before today's spending was logged. */
export function allowanceAtDayStart(input: MonthInputs, todaySpent: number, days: number): number {
  return dailyAllowance(freeAmount(input) + whole(todaySpent), days);
}

export function tomorrowAllowance(input: MonthInputs, days: number): number {
  return dailyAllowance(freeAmount(input), days - 1);
}

export function isOverBudget(todaySpent: number, allowanceAtStart: number): boolean {
  return whole(todaySpent) > allowanceAtStart;
}

export function simulatorVerdict(freeBefore: number, total: number): Verdict {
  const after = whole(freeBefore) - whole(total);
  if (after < 0) return "over";
  if (whole(freeBefore) > 0 && after < whole(freeBefore) * 0.2) return "tight";
  return "fits";
}

/** Version 1 rule. Refine once two months of history exist. */
export function safeToBuy(price: number, free: number): boolean {
  return whole(price) <= whole(free) * 0.4;
}

export function goalPace(remaining: number, daysUntilDue: number): number {
  if (daysUntilDue <= 0) return Math.max(0, whole(remaining));
  return Math.ceil(Math.max(0, whole(remaining)) / daysUntilDue);
}

export type DebtFrequency = "weekly" | "monthly";

export type Installment = { dueDate: string; amount: number; index: number };

export function debtSchedule(input: {
  total: number;
  installments: number;
  frequency: DebtFrequency;
  firstDueDate: string;
}): Installment[] {
  const count = Math.max(0, Math.trunc(input.installments));
  if (count === 0) return [];
  const total = whole(input.total);
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  const items: Installment[] = [];
  for (let index = 0; index < count; index += 1) {
    const dueDate = input.frequency === "weekly" ? addDays(input.firstDueDate, index * 7) : addMonths(input.firstDueDate, index);
    items.push({ dueDate, amount: base + (index === count - 1 ? remainder : 0), index });
  }
  return items;
}

export function addMonths(dateISO: string, months: number): string {
  const year = Number(dateISO.slice(0, 4));
  const month = Number(dateISO.slice(5, 7));
  const day = Number(dateISO.slice(8, 10));
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const clamped = Math.min(day, last);
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(clamped).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function weekStart(dateISO: string): string {
  const year = Number(dateISO.slice(0, 4));
  const month = Number(dateISO.slice(5, 7));
  const day = Number(dateISO.slice(8, 10));
  const utc = new Date(Date.UTC(year, month - 1, day));
  const sundayOffset = utc.getUTCDay();
  return addDays(dateISO, -sundayOffset);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].map(whole).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
  return sorted[mid] ?? 0;
}

export type DatedAmount = { date: string; amount: number };

export function weekendEffect(entries: DatedAmount[]): number | null {
  const weekday: number[] = [];
  const weekend: number[] = [];
  const byDay = new Map<string, number>();
  for (const entry of entries) byDay.set(entry.date, (byDay.get(entry.date) ?? 0) + entry.amount);
  if (byDay.size < 7) return null;
  for (const [date, amount] of byDay) {
    const utc = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))));
    const day = utc.getUTCDay();
    if (day === 0 || day === 6) weekend.push(amount);
    else weekday.push(amount);
  }
  if (weekday.length === 0 || weekend.length === 0) return null;
  const avg = (list: number[]) => list.reduce((sum, value) => sum + value, 0) / list.length;
  const base = avg(weekday);
  if (base <= 0) return null;
  return Math.round(((avg(weekend) - base) / base) * 100);
}

export function streakEnding(dateISO: string, loggedDates: Set<string>): number {
  let count = 0;
  let cursor = dateISO;
  while (loggedDates.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export const SIMULATOR_PRESETS: Record<string, { labelKey: string; lines: { name: string; amount: number }[] }> = {
  cinema: { labelKey: "cinema", lines: [{ name: "Ticket", amount: 3000 }, { name: "Snacks", amount: 2000 }, { name: "Transport", amount: 1500 }] },
  restaurant: { labelKey: "restaurant", lines: [{ name: "Meal", amount: 8000 }, { name: "Transport", amount: 1500 }] },
  trip: { labelKey: "trip", lines: [{ name: "Transport", amount: 15000 }, { name: "Meal", amount: 5000 }] },
  shopping: { labelKey: "shopping", lines: [{ name: "Other", amount: 10000 }] },
  other: { labelKey: "other", lines: [{ name: "Other", amount: 5000 }] },
};
