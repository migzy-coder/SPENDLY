/** Pure derivations from the raw data. Everything money related ends up here. */

import {
  CATEGORIES,
  DEFAULT_PAYDAY,
  addDays,
  cycleEnd,
  cycleStart,
  dailyAllowance,
  daysRemaining,
  median,
  streakEnding,
  whole,
} from "./money";
import type { Bootstrap, Category, DebtPayment, Entry, Planned } from "./types";

export type MonthState = {
  month: string;
  periodStart: string;
  periodEnd: string;
  income: number;
  fixedCosts: number;
  savings: number;
  debtPayments: number;
  wishlist: number;
  spent: number;
  plannedRemaining: number;
  left: number;
  leftToSpend: number;
  free: number;
  allowance: number;
  daysRemaining: number;
  today: string;
  todaySpent: number;
  allowanceAtStart: number;
  overBudget: boolean;
  tomorrowAllowance: number;
  streak: number;
  byCategory: Record<Category, number>;
};

function sumBy<T>(items: T[], pick: (item: T) => number): number {
  return whole(items.reduce((total, item) => total + pick(item), 0));
}

export function categoryTotals(entries: Entry[]): Record<Category, number> {
  const totals = {} as Record<Category, number>;
  for (const category of CATEGORIES) totals[category] = 0;
  for (const entry of entries) {
    if (entry.category in totals) totals[entry.category] += entry.amount;
  }
  for (const category of CATEGORIES) totals[category] = whole(totals[category]);
  return totals;
}

export function debtDueInRange(
  payments: DebtPayment[],
  debts: Bootstrap["debts"],
  from: string,
  to: string,
): number {
  const owedToOthers = new Set(debts.filter((debt) => debt.direction === "owe").map((debt) => debt.id));
  return sumBy(
    payments.filter((payment) => owedToOthers.has(payment.debt_id) && payment.due_date >= from && payment.due_date <= to),
    (payment) => payment.amount,
  );
}

/**
 * The plan that applies to a pay cycle: exact match, otherwise the most recent
 * plan before it, otherwise the earliest plan (data order is not guaranteed).
 */
export function planForCycle(plans: Bootstrap["plans"], month: string): Bootstrap["plans"][number] | null {
  if (!plans.length) return null;
  const exact = plans.find((item) => item.month === month);
  if (exact) return exact;
  const sorted = [...plans].sort((a, b) => a.month.localeCompare(b.month));
  const before = sorted.filter((item) => item.month <= month);
  return before[before.length - 1] ?? sorted[0] ?? null;
}

/**
 * Everything the home and plan screens need for the current pay cycle.
 * The cycle starts on the first day of the saved payday window and ends the
 * day before the next one, so a salary landing on the 24th covers the 24th to
 * the 23rd of next month.
 */
export function buildMonthState(data: Bootstrap, today: string): MonthState {
  const paydayDay = data.user?.payday_day ?? DEFAULT_PAYDAY;
  const start = cycleStart(today, paydayDay);
  const end = cycleEnd(today, paydayDay);
  const month = start.slice(0, 7);
  const inCycle = (date: string) => date >= start && date <= end;

  const plan = planForCycle(data.plans, month);
  const entries = data.entries.filter((entry) => inCycle(entry.date));
  const cycleContributions = data.contributions.filter((item) => inCycle(item.date));

  const income = plan?.income ?? 0;
  const fixedCosts = sumBy(data.fixedCosts.filter((cost) => cost.recurring), (cost) => cost.amount);
  const savings = Math.max(plan?.savings_target ?? 0, sumBy(cycleContributions, (item) => item.amount));
  const debtPayments = debtDueInRange(data.payments, data.debts, start, end);
  const wishlist = plan?.wishlist_budget ?? 0;
  const spent = sumBy(entries, (entry) => entry.amount);

  const plannedRemaining = sumBy(
    data.planned.filter((item) => item.status === "planned" && item.date >= today && item.date <= end),
    (item) => item.amount,
  );

  const left = whole(income - fixedCosts - savings - debtPayments - wishlist);
  const leftToSpend = whole(left - spent);
  const free = whole(leftToSpend - plannedRemaining);
  const days = daysRemaining(today, paydayDay);
  const allowance = dailyAllowance(free, days);

  const todaySpent = sumBy(
    data.entries.filter((entry) => entry.date === today),
    (entry) => entry.amount,
  );
  const allowanceAtStart = dailyAllowance(whole(free + todaySpent), days);

  const loggedDates = new Set<string>();
  for (const entry of data.entries) loggedDates.add(entry.date);
  for (const log of data.dayLogs) loggedDates.add(log.date);

  return {
    month,
    periodStart: start,
    periodEnd: end,
    income,
    fixedCosts,
    savings,
    debtPayments,
    wishlist,
    spent,
    plannedRemaining,
    left,
    leftToSpend,
    free,
    allowance,
    daysRemaining: days,
    today,
    todaySpent,
    allowanceAtStart,
    overBudget: todaySpent > allowanceAtStart,
    tomorrowAllowance: dailyAllowance(free, Math.max(0, days - 1)),
    streak: streakEnding(today, loggedDates),
    byCategory: categoryTotals(entries),
  };
}

/** Median of the last five amounts spent in a category, used to pre-select. */
export function usualAmount(entries: Entry[], category: Category, before: string): number {
  const recent = entries
    .filter((entry) => entry.category === category && entry.date < before)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map((entry) => entry.amount);
  return median(recent);
}

export function entriesForDay(entries: Entry[], date: string): Entry[] {
  return entries.filter((entry) => entry.date === date).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function plannedForDay(planned: Planned[], date: string): Planned[] {
  return planned.filter((item) => item.date === date && item.status === "planned");
}

export function entriesInRange(entries: Entry[], from: string, to: string): Entry[] {
  return entries.filter((entry) => entry.date >= from && entry.date <= to);
}

export function totalOf(entries: Entry[]): number {
  return sumBy(entries, (entry) => entry.amount);
}

export function previousDay(date: string): string {
  return addDays(date, -1);
}
