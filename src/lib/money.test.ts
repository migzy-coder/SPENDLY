import { describe, expect, it } from "vitest";
import {
  allowanceAtDayStart,
  dailyAllowance,
  debtSchedule,
  formatXaf,
  freeAmount,
  goalPace,
  isOverBudget,
  left,
  leftToSpend,
  safeToBuy,
  simulatorVerdict,
  streakEnding,
  tomorrowAllowance,
  weekendEffect,
  weekStart,
} from "./money";

const base = {
  income: 200_000,
  fixedCosts: 50_000,
  savings: 20_000,
  debtPayments: 10_000,
  wishlist: 5_000,
  spent: 30_000,
  plannedRemaining: 15_000,
};

describe("month plan", () => {
  it("computes left, free, and a 100 XAF allowance", () => {
    expect(left(base)).toBe(115_000);
    expect(leftToSpend(base)).toBe(85_000);
    expect(freeAmount(base)).toBe(70_000);
    expect(dailyAllowance(70_000, 12)).toBe(5_800);
  });

  it("handles zero income and zero days left", () => {
    expect(left({ ...base, income: 0 })).toBe(-85_000);
    expect(dailyAllowance(70_000, 0)).toBe(0);
    expect(dailyAllowance(-100, 5)).toBe(0);
  });
});

describe("over budget", () => {
  it("compares the day with the allowance from the start of that day", () => {
    const start = allowanceAtDayStart(base, 8_000, 12);
    expect(start).toBe(dailyAllowance(78_000, 12));
    expect(isOverBudget(8_000, start)).toBe(true);
    expect(isOverBudget(1_000, start)).toBe(false);
    expect(tomorrowAllowance(base, 12)).toBe(dailyAllowance(70_000, 11));
  });
});

describe("simulator and wishlist", () => {
  it("returns over, tight, and fits", () => {
    expect(simulatorVerdict(10_000, 12_000)).toBe("over");
    expect(simulatorVerdict(10_000, 8_500)).toBe("tight");
    expect(simulatorVerdict(10_000, 2_000)).toBe("fits");
    expect(simulatorVerdict(0, 0)).toBe("fits");
  });

  it("marks a wish safe at 40 percent of free money", () => {
    expect(safeToBuy(4_000, 10_000)).toBe(true);
    expect(safeToBuy(4_001, 10_000)).toBe(false);
  });
});

describe("goals, debts, stats", () => {
  it("paces a goal and builds a debt schedule", () => {
    expect(goalPace(30_000, 10)).toBe(3_000);
    expect(goalPace(100, 0)).toBe(100);
    const weekly = debtSchedule({ total: 10_000, installments: 4, frequency: "weekly", firstDueDate: "2026-11-25" });
    expect(weekly).toHaveLength(4);
    expect(weekly[0]?.amount).toBe(2_500);
    expect(weekly[3]?.dueDate).toBe("2026-12-16");
    const monthly = debtSchedule({ total: 100, installments: 3, frequency: "monthly", firstDueDate: "2026-01-31" });
    expect(monthly[1]?.dueDate).toBe("2026-02-28");
    expect(monthly[2]?.amount).toBe(34);
  });

  it("uses Sunday weeks, streaks, and weekend insight only after seven days", () => {
    expect(weekStart("2026-11-12")).toBe("2026-11-08");
    expect(formatXaf(28500)).toBe("28\u00A0500");
    expect(formatXaf(-1500)).toBe("−1\u00A0500");
    const logged = new Set(["2026-11-10", "2026-11-11", "2026-11-12"]);
    expect(streakEnding("2026-11-12", logged)).toBe(3);
    expect(streakEnding("2026-11-12", new Set(["2026-11-12", "2026-11-10"]))).toBe(1);
    expect(weekendEffect([{ date: "2026-11-12", amount: 100 }])).toBeNull();
  });
});
