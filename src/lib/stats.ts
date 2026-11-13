/** Statistics windows, bars and insights. Pure functions, no side effects. */

import { addDays, addMonths, daysInMonth, monthKey, weekStart } from "./money";
import type { Category, Entry, Planned } from "./types";

export type Range = { from: string; to: string };

export function weekRange(date: string): Range {
  const from = weekStart(date);
  return { from, to: addDays(from, 6) };
}

export function monthRange(date: string): Range {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const last = daysInMonth(date);
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  };
}

export function dayLabel(date: string, locale: "fr" | "en"): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(".", "")
    .slice(0, 3);
}

export function monthLabel(date: string, locale: "fr" | "en"): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { month: "short", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(".", "")
    .slice(0, 4);
}

export function longDate(date: string, locale: "fr" | "en"): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export type Bar = {
  date: string;
  label: string;
  value: number;
  planned: number;
  isFuture: boolean;
  isToday: boolean;
};

export function dailyBars(
  entries: Entry[],
  planned: Planned[],
  range: Range,
  today: string,
  locale: "fr" | "en",
): Bar[] {
  const bars: Bar[] = [];
  let cursor = range.from;
  while (cursor <= range.to) {
    const dayEntries = entries.filter((entry) => entry.date === cursor);
    const dayPlanned = planned
      .filter((item) => item.status === "planned" && item.date === cursor)
      .reduce((total, item) => total + item.amount, 0);
    bars.push({
      date: cursor,
      label: dayLabel(cursor, locale),
      value: dayEntries.reduce((total, entry) => total + entry.amount, 0),
      planned: dayPlanned,
      isFuture: cursor > today,
      isToday: cursor === today,
    });
    cursor = addDays(cursor, 1);
  }
  return bars;
}

export function weeklyBars(
  entries: Entry[],
  range: Range,
  today: string,
): { label: string; from: string; to: string; value: number; isFuture: boolean }[] {
  const bars = [];
  let cursor = range.from;
  let index = 1;
  while (cursor <= range.to) {
    const to = addDays(cursor, 6);
    bars.push({
      label: `S${index}`,
      from: cursor,
      to,
      value: entries
        .filter((entry) => entry.date >= cursor && entry.date <= to)
        .reduce((total, entry) => total + entry.amount, 0),
      isFuture: cursor > today,
    });
    cursor = addDays(cursor, 7);
    index += 1;
  }
  return bars;
}

export function changePercent(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type Insights = {
  weekendPercent: number | null;
  runOutDay: number | null;
  projection: number | null;
  smallPurchases: number;
  loggedDays: number;
};

export function computeInsights(entries: Entry[], free: number, daysRemaining: number): Insights {
  const byDay = new Map<string, number>();
  for (const entry of entries) byDay.set(entry.date, (byDay.get(entry.date) ?? 0) + entry.amount);

  const weekend: number[] = [];
  const weekday: number[] = [];
  for (const [date, amount] of byDay) {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (day === 0 || day === 6) weekend.push(amount);
    else weekday.push(amount);
  }
  let weekendPercent: number | null = null;
  if (weekday.length && weekend.length) {
    const average = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length;
    const base = average(weekday);
    if (base > 0) weekendPercent = Math.round(((average(weekend) - base) / base) * 100);
  }

  const sorted = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let runOutDay: number | null = null;
  if (sorted.length >= 2 && free > 0) {
    let running = 0;
    for (const [date, amount] of sorted) {
      running += amount;
      if (running >= free) {
        runOutDay = Number(date.slice(8, 10));
        break;
      }
    }
  }

  const averageDaily = sorted.length ? sorted.reduce((sum, [, amount]) => sum + amount, 0) / sorted.length : 0;
  const projection = averageDaily > 0 ? Math.round(free - averageDaily * daysRemaining) : null;

  const smallPurchases = entries
    .filter((entry) => entry.amount < 1000)
    .reduce((total, entry) => total + entry.amount, 0);

  return {
    weekendPercent,
    runOutDay,
    projection,
    smallPurchases,
    loggedDays: byDay.size,
  };
}

export function monthsBack(month: string, count: number): string[] {
  const list: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    list.push(monthKey(addMonths(`${month}-01`, -index)));
  }
  return list;
}

export function categoryTotals(entries: Entry[]): { category: Category; amount: number }[] {
  const totals = new Map<Category, number>();
  for (const entry of entries) {
    totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amount);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
