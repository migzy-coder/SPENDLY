import { describe, expect, it } from "vitest";
import { buildMonthState } from "./selectors";
import type { Bootstrap, Category, Entry, MonthPlan, Planned } from "./types";

function plan(month: string, income: number): MonthPlan {
  return {
    id: `plan-${month}`,
    user_id: "u1",
    month,
    income,
    savings_target: 0,
    wishlist_budget: 0,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function entry(id: string, date: string, amount: number, category: Category = "Food"): Entry {
  return {
    id,
    user_id: "u1",
    date,
    category,
    amount,
    payment_type: "Cash",
    note: "",
    client_id: `c-${id}`,
    created_at: `${date}T12:00:00.000Z`,
  };
}

function planned(id: string, date: string, amount: number): Planned {
  return {
    id,
    user_id: "u1",
    name: id,
    date,
    category: "Social",
    amount,
    status: "planned",
    created_at: "2026-10-01T00:00:00.000Z",
  };
}

function bootstrap(overrides: Partial<Bootstrap> = {}): Bootstrap {
  return {
    user: {
      id: "u1",
      name: "Test",
      payday_day: 25,
      payday_day_end: 28,
      nightly_time: "21:00",
      timezone: "Africa/Douala",
      locale: "fr",
      theme: "light",
      onboarded: 1,
      created_at: "2026-01-01T00:00:00.000Z",
    },
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
    ...overrides,
  };
}

describe("buildMonthState with a pay cycle", () => {
  it("only counts spending inside the current cycle", () => {
    const state = buildMonthState(
      bootstrap({
        plans: [plan("2026-10", 300_000)],
        entries: [
          entry("before", "2026-10-24", 4_000),
          entry("start", "2026-10-25", 1_000),
          entry("end", "2026-11-24", 2_000),
          entry("after", "2026-11-25", 8_000),
        ],
      }),
      "2026-11-18",
    );

    expect(state.periodStart).toBe("2026-10-25");
    expect(state.periodEnd).toBe("2026-11-24");
    expect(state.month).toBe("2026-10");
    expect(state.spent).toBe(3_000);
    expect(state.income).toBe(300_000);
    expect(state.left).toBe(300_000);
    expect(state.daysRemaining).toBe(7);
    expect(state.free).toBe(297_000);
    expect(state.allowance).toBe(42_400);
  });

  it("ignores planned spending that falls in the next cycle", () => {
    const state = buildMonthState(
      bootstrap({
        plans: [plan("2026-10", 300_000)],
        planned: [planned("in", "2026-11-24", 5_000), planned("out", "2026-12-01", 9_000)],
      }),
      "2026-11-18",
    );

    expect(state.plannedRemaining).toBe(5_000);
    expect(state.free).toBe(295_000);
  });

  it("falls back to the latest plan when the cycle has none", () => {
    const state = buildMonthState(
      bootstrap({ plans: [plan("2026-10", 250_000), plan("2026-08", 100_000)] }),
      "2026-12-25",
    );

    expect(state.periodStart).toBe("2026-12-25");
    expect(state.periodEnd).toBe("2027-01-24");
    expect(state.income).toBe(250_000);
  });
});
