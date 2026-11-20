/** Pure derivations from the raw data. Everything money related ends up here. */

import {
  CATEGORIES,
  DEFAULT_HORIZON,
  DEFAULT_PAYDAY,
  addDays,
  cycleStart,
  dailyAllowance,
  daysBetween,
  fixedCostsDueInPeriod,
  inPaydayWindow,
  median,
  periodDaysRemaining,
  periodEndFor,
  shortfall,
  streakEnding,
  whole,
} from "./money";
import type { Bootstrap, Category, DebtPayment, Entry, Period, Planned } from "./types";

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
  /* Period model */
  period: Period | null;
  startingBalance: number;
  incomeReceived: number;
  expectedIncome: number;
  adjustments: number;
  currentBalance: number;
  committed: number;
  missing: number;
  horizonDays: number;
  loggedDays: number;
  insightsReady: boolean;
  salaryPrompt: boolean;
  primarySalaryAmount: number;
  fixedCostReminder: boolean;
  balanceConfirmationNeeded: boolean;
  balanceNudge: boolean;
};

export type PeriodState = MonthState;

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
 * Kept for calendar browsing; the period model no longer depends on it.
 */
export function planForCycle(plans: Bootstrap["plans"], month: string): Bootstrap["plans"][number] | null {
  if (!plans.length) return null;
  const exact = plans.find((item) => item.month === month);
  if (exact) return exact;
  const sorted = [...plans].sort((a, b) => a.month.localeCompare(b.month));
  const before = sorted.filter((item) => item.month <= month);
  return before[before.length - 1] ?? sorted[0] ?? null;
}

/** Active period, or the most recent one before today (for late bootstrap writes). */
export function activePeriod(periods: Period[], today: string): Period | null {
  const open = periods.find((item) => item.start_date <= today && item.end_date >= today && !item.closed_at);
  if (open) return open;
  const past = periods.filter((item) => item.start_date <= today).sort((a, b) => b.start_date.localeCompare(a.start_date));
  return past[0] ?? null;
}

/**
 * Everything Today and Plan need for the current budget period.
 *
 * current balance = starting balance + income received − spending + adjustments
 * committed = fixed costs due + debt installments due + planned spending + savings set aside
 * free = current balance − committed
 * allowance = free ÷ days left (today included), rounded down to 100 XAF
 */
export function buildPeriodState(data: Bootstrap, today: string): PeriodState {
  const user = data.user;
  const paydayDay = user?.payday_day ?? DEFAULT_PAYDAY;
  const horizonDays = user?.rolling_horizon_days || DEFAULT_HORIZON;
  const period = activePeriod(data.periods, today);
  const start = period?.start_date ?? cycleStart(today, paydayDay);
  const end = period?.end_date ?? periodEndFor(start, paydayDay, user?.income_mode === "variable" ? horizonDays : 0);
  const inPeriod = (date: string) => date >= start && date <= end;

  const entries = data.entries.filter((entry) => inPeriod(entry.date));
  const cycleContributions = data.contributions.filter((item) => inPeriod(item.date));
  const received = data.incomeEvents.filter((item) => item.status === "received" && inPeriod(item.date));
  const expected = data.incomeEvents.filter((item) => item.status === "expected" && inPeriod(item.date));

  const startingBalance = whole(period?.starting_balance ?? 0);
  const income = sumBy(received, (item) => item.amount);
  const expectedIncome = sumBy(expected, (item) => item.amount);
  const adjustments = sumBy(data.adjustments.filter((item) => inPeriod(item.date)), (item) => item.amount);
  const spent = sumBy(entries, (item) => item.amount);
  const currentBalance = whole(startingBalance + income - spent + adjustments);

  const fixedCosts = fixedCostsDueInPeriod(data.fixedCosts, start, end);
  const debtPayments = debtDueInRange(data.payments, data.debts, start, end);
  // Only money actually set aside counts — an unfulfilled savings target does not.
  const savings = sumBy(cycleContributions, (item) => item.amount);
  const plannedRemaining = sumBy(
    data.planned.filter((item) => item.status === "planned" && item.date >= today && item.date <= end),
    (item) => item.amount,
  );
  const committed = whole(fixedCosts + debtPayments + savings + plannedRemaining);
  const free = whole(currentBalance - committed);
  const days = periodDaysRemaining(today, end);
  const allowance = dailyAllowance(free, days);

  const todaySpent = sumBy(data.entries.filter((entry) => entry.date === today), (item) => item.amount);
  const allowanceAtStart = dailyAllowance(whole(free + todaySpent), days);

  const loggedDates = new Set<string>();
  for (const entry of data.entries) loggedDates.add(entry.date);
  for (const log of data.dayLogs) loggedDates.add(log.date);

  const primary = data.incomeSources.find((item) => item.is_primary === 1);
  const balanceDate = period?.balance_confirmed_at?.slice(0, 10) ?? period?.start_date ?? today;
  const sinceBalance = Math.max(0, daysBetween(balanceDate, today));

  return {
    month: start.slice(0, 7),
    periodStart: start,
    periodEnd: end,
    income,
    fixedCosts,
    savings,
    debtPayments,
    wishlist: 0,
    spent,
    plannedRemaining,
    left: currentBalance,
    leftToSpend: free,
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
    period,
    startingBalance,
    incomeReceived: income,
    expectedIncome,
    adjustments,
    currentBalance,
    committed,
    missing: shortfall(free),
    horizonDays,
    loggedDays: loggedDates.size,
    insightsReady: loggedDates.size >= 7,
    salaryPrompt:
      Boolean(primary && !period?.salary_confirmed_at) &&
      inPaydayWindow(today, paydayDay, user?.payday_day_end ?? paydayDay),
    primarySalaryAmount: primary?.typical_amount ?? 0,
    fixedCostReminder: data.fixedCosts.length === 0 && user?.fixed_cost_dismissed !== 1,
    balanceConfirmationNeeded: Boolean(period && !period.balance_confirmed_at),
    balanceNudge: Boolean(period) && sinceBalance >= 7,
  };
}

/** Previous name, kept so older screens keep compiling. */
export const buildMonthState = buildPeriodState;

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
