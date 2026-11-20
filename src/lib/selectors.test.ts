import { describe, expect, it } from "vitest";
import { buildPeriodState } from "./selectors";
import type {
  Bootstrap,
  Category,
  Entry,
  FixedCost,
  IncomeEvent,
  Period,
  Planned,
} from "./types";

function period(overrides: Partial<Period> = {}): Period {
  return {
    id: "p1",
    user_id: "u1",
    start_date: "2026-11-17",
    end_date: "2026-11-24",
    starting_balance: 60_000,
    horizon_days: 0,
    closed_at: null,
    salary_confirmed_at: null,
    balance_confirmed_at: "2026-11-17T00:00:00.000Z",
    created_at: "2026-11-17T00:00:00.000Z",
    ...overrides,
  };
}

function entry(id: string, date: string, amount: number, category: Category = "Food"): Entry {
  return {
    id, user_id: "u1", date, category, amount, payment_type: "Cash", note: "",
    client_id: `c-${id}`, created_at: `${date}T12:00:00.000Z`,
  };
}

function planned(id: string, date: string, amount: number): Planned {
  return {
    id, user_id: "u1", name: id, date, category: "Social", amount,
    status: "planned", created_at: "2026-11-01T00:00:00.000Z",
  };
}

function fixed(id: string, amount: number, overrides: Partial<FixedCost> = {}): FixedCost {
  return {
    id, user_id: "u1", name: id, amount, recurring: 1, category: "Other",
    frequency: "one_off", due_day: null, due_date: null,
    created_at: "2026-11-01T00:00:00.000Z", ...overrides,
  };
}

function income(id: string, date: string, amount: number, status: IncomeEvent["status"] = "received"): IncomeEvent {
  return {
    id, user_id: "u1", source_id: "salary", amount, date, note: "", status,
    created_at: `${date}T12:00:00.000Z`,
  };
}

function bootstrap(overrides: Partial<Bootstrap> = {}): Bootstrap {
  return {
    user: {
      id: "u1", name: "Test", payday_day: 25, payday_day_end: 28,
      nightly_time: "21:00", timezone: "Africa/Douala", locale: "fr", theme: "light",
      onboarded: 1, income_mode: "salary", rolling_horizon_days: 30,
      fixed_cost_dismissed: 0, created_at: "2026-01-01T00:00:00.000Z",
    },
    plans: [], fixedCosts: [], entries: [], dayLogs: [], planned: [],
    goals: [], contributions: [], wishes: [], debts: [], payments: [], reminders: [],
    periods: [period()],
    incomeSources: [],
    incomeEvents: [],
    adjustments: [],
    ...overrides,
  };
}

describe("period allowance", () => {
  it("matches the mid-month example: 17th, 60 000, rent 15 000, planned 6 500 → 4 800", () => {
    const state = buildPeriodState(
      bootstrap({
        fixedCosts: [fixed("rent", 15_000, { due_date: "2026-11-20" })],
        planned: [planned("trip", "2026-11-18", 6_500)],
      }),
      "2026-11-17",
    );
    expect(state.daysRemaining).toBe(8);
    expect(state.currentBalance).toBe(60_000);
    expect(state.committed).toBe(21_500);
    expect(state.free).toBe(38_500);
    expect(state.allowance).toBe(4_800);
  });

  it("variable-only horizon: received income raises the allowance, expected income does not", () => {
    const p = period({
      id: "v1", start_date: "2026-11-01", end_date: "2026-11-14",
      starting_balance: 20_000, horizon_days: 14,
    });
    const data = bootstrap({
      user: { ...bootstrap().user!, income_mode: "variable", rolling_horizon_days: 14 },
      periods: [p],
      incomeEvents: [income("expected", "2026-11-03", 50_000, "expected")],
    });
    const before = buildPeriodState(data, "2026-11-05");
    expect(before.allowance).toBe(2_000);
    expect(before.expectedIncome).toBe(50_000);

    const after = buildPeriodState(
      { ...data, incomeEvents: [...data.incomeEvents, income("got", "2026-11-06", 10_000)] },
      "2026-11-06",
    );
    expect(after.incomeReceived).toBe(10_000);
    expect(after.free).toBe(30_000);
    expect(after.allowance).toBe(3_300);
  });

  it("salary plus variable income are both counted in the period", () => {
    const state = buildPeriodState(
      bootstrap({
        periods: [period({ start_date: "2026-11-25", end_date: "2026-12-24", starting_balance: 10_000 })],
        incomeEvents: [income("salary", "2026-11-25", 300_000), income("side", "2026-11-27", 20_000)],
      }),
      "2026-11-28",
    );
    expect(state.incomeReceived).toBe(320_000);
    expect(state.currentBalance).toBe(330_000);
  });

  it("shows the shortfall instead of a zero allowance when free is negative", () => {
    const state = buildPeriodState(
      bootstrap({
        periods: [period({ starting_balance: 10_000 })],
        fixedCosts: [fixed("rent", 15_000, { due_date: "2026-11-20" })],
      }),
      "2026-11-17",
    );
    expect(state.free).toBe(-5_000);
    expect(state.missing).toBe(5_000);
    expect(state.allowance).toBe(0);
  });

  it("returns zero allowance when no days remain", () => {
    const state = buildPeriodState(
      bootstrap({ periods: [period({ end_date: "2026-11-23" })] }),
      "2026-11-24",
    );
    expect(state.daysRemaining).toBe(0);
    expect(state.allowance).toBe(0);
  });

  it("applies a balance adjustment without changing the starting balance", () => {
    const state = buildPeriodState(
      bootstrap({
        adjustments: [{
          id: "a1", user_id: "u1", period_id: "p1", amount: 5_000,
          note: "cash count", date: "2026-11-18", created_at: "2026-11-18T00:00:00.000Z",
        }],
      }),
      "2026-11-18",
    );
    expect(state.startingBalance).toBe(60_000);
    expect(state.adjustments).toBe(5_000);
    expect(state.currentBalance).toBe(65_000);
  });

  it("generates weekly and monthly fixed costs inside the period", () => {
    const state = buildPeriodState(
      bootstrap({
        periods: [period({ start_date: "2026-11-01", end_date: "2026-11-30" })],
        fixedCosts: [
          fixed("weekly", 1_000, { frequency: "weekly", due_date: "2026-11-02" }),
          fixed("monthly", 15_000, { frequency: "monthly", due_day: 20 }),
        ],
      }),
      "2026-11-01",
    );
    // 2, 9, 16, 23, 30 → five weekly occurrences, plus one monthly rent.
    expect(state.fixedCosts).toBe(20_000);
  });

  it("keeps a migrated user's number stable by deriving the starting balance", () => {
    const starting = 300_000 - 0 - 4_000; // plan income − wishlist − spending before today
    const state = buildPeriodState(
      bootstrap({
        periods: [period({ start_date: "2026-11-17", starting_balance: starting })],
        entries: [entry("today", "2026-11-17", 1_000)],
      }),
      "2026-11-17",
    );
    expect(state.currentBalance).toBe(296_000 - 1_000);
    expect(state.free).toBe(295_000);
  });
});
