/** Shared shapes between the app, the Worker and the local demo store. */

export type Locale = "fr" | "en";
export type Theme = "light" | "dark" | "system";
export type Category = "Food" | "Transport" | "Airtime" | "Clothes" | "Social" | "Other";
export type PaymentType = "Cash" | "Transfer" | "Mobile Money";
export type DebtDirection = "owe" | "owed";
export type DebtFrequency = "weekly" | "monthly";
export type PlannedStatus = "planned" | "done" | "skipped";
export type WishPriority = "Need" | "Want" | "Treat";
export type WishStatus = "active" | "waiting" | "bought" | "removed";

/** How a person earns: a salary, variable income, or both. */
export type IncomeMode = "salary" | "variable" | "both";
export type IncomeSourceType = "salary" | "business" | "freelance" | "side" | "gift" | "other";
export type IncomeFrequency = "monthly" | "weekly";
export type FixedCostFrequency = "weekly" | "monthly" | "one_off";

export type User = {
  id: string;
  name: string;
  payday_day: number;
  payday_day_end?: number;
  nightly_time: string;
  timezone: string;
  locale: Locale;
  theme: Theme;
  onboarded: number;
  income_mode: IncomeMode;
  /** Used when there is no fixed income: 7, 14 or 30 days. */
  rolling_horizon_days: number;
  fixed_cost_dismissed: number;
  created_at: string;
};

/** A salary or a variable source (business, freelance, side job, gift…). */
export type IncomeSource = {
  id: string;
  user_id: string;
  name: string;
  type: IncomeSourceType;
  frequency: IncomeFrequency | null;
  payday_day: number | null;
  typical_amount: number;
  is_primary: number;
  created_at: string;
};

/** Money that actually arrived (received) or is planned (expected, never counted). */
export type IncomeEvent = {
  id: string;
  user_id: string;
  source_id: string;
  amount: number;
  date: string;
  note: string;
  status: "received" | "expected";
  created_at: string;
};

/** One budget period. `end_date` is inclusive. */
export type Period = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  starting_balance: number;
  horizon_days: number;
  closed_at: string | null;
  salary_confirmed_at: string | null;
  balance_confirmed_at: string | null;
  created_at: string;
};

/** Never rewrites the period's starting balance — only adds a signed correction. */
export type BalanceAdjustment = {
  id: string;
  user_id: string;
  period_id: string;
  amount: number;
  note: string;
  date: string;
  created_at: string;
};

export type MonthPlan = {
  id: string;
  user_id: string;
  month: string;
  income: number;
  savings_target: number;
  wishlist_budget: number;
  created_at: string;
};

export type FixedCost = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  recurring: number;
  category: Category;
  frequency: FixedCostFrequency;
  /** Day of month for monthly costs (1–31, clamped in short months). */
  due_day: number | null;
  /** Exact date for one-off costs, or the first occurrence for weekly costs. */
  due_date: string | null;
  created_at: string;
};

export type Entry = {
  id: string;
  user_id: string;
  date: string;
  category: Category;
  amount: number;
  payment_type: PaymentType;
  note: string;
  client_id: string;
  created_at: string;
};

export type DayLog = {
  id: string;
  user_id: string;
  date: string;
  spent_nothing: number;
  created_at: string;
};

export type Planned = {
  id: string;
  user_id: string;
  name: string;
  date: string;
  category: Category;
  amount: number;
  status: PlannedStatus;
  created_at: string;
};

export type Wish = {
  id: string;
  user_id: string;
  name: string;
  price: number;
  source: string;
  link: string;
  priority: WishPriority;
  unlock_date: string | null;
  status: WishStatus;
  wait_until: string | null;
  created_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target: number;
  due_date: string | null;
  created_at: string;
};

export type GoalContribution = {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  date: string;
  created_at: string;
};

export type Debt = {
  id: string;
  user_id: string;
  person: string;
  direction: DebtDirection;
  total: number;
  installments: number;
  frequency: DebtFrequency;
  first_due_date: string;
  created_at: string;
};

export type DebtPayment = {
  id: string;
  user_id: string;
  debt_id: string;
  due_date: string;
  amount: number;
  paid_at: string | null;
  created_at: string;
};

export type Reminder = {
  id: string;
  user_id: string;
  key: "nightly" | "planned" | "payday" | "missed" | "weekly";
  enabled: number;
  time_choice: string;
  created_at: string;
};

export type Bootstrap = {
  user: User | null;
  plans: MonthPlan[];
  fixedCosts: FixedCost[];
  entries: Entry[];
  dayLogs: DayLog[];
  planned: Planned[];
  goals: Goal[];
  contributions: GoalContribution[];
  wishes: Wish[];
  debts: Debt[];
  payments: DebtPayment[];
  reminders: Reminder[];
  periods: Period[];
  incomeSources: IncomeSource[];
  incomeEvents: IncomeEvent[];
  adjustments: BalanceAdjustment[];
};

export type PlanPayload = {
  month: string;
  income: number;
  savingsTarget: number;
  wishlistBudget: number;
};

export type EntryPayload = {
  clientId: string;
  date: string;
  category: Category;
  amount: number;
  paymentType: PaymentType;
  note: string;
};

export type PlannedPayload = {
  name: string;
  date: string;
  category: Category;
  amount: number;
};

export type GoalPayload = {
  name: string;
  target: number;
  dueDate: string | null;
};

export type WishPayload = {
  name: string;
  price: number;
  source: string;
  link: string;
  priority: WishPriority;
  unlockDate: string | null;
};

export type DebtPayload = {
  person: string;
  direction: DebtDirection;
  total: number;
  installments: number;
  frequency: DebtFrequency;
  firstDueDate: string;
};

export type ReminderItem = {
  key: Reminder["key"];
  enabled: boolean;
  timeChoice: string;
};

/* Period-based money model ------------------------------------------------- */

export type SetupPayload = {
  name: string;
  paydayDay: number;
  paydayDayEnd?: number;
  nightlyTime: string;
  locale: Locale;
  incomeMode: IncomeMode;
  balance: number;
  nextIncomeDate: string | null;
  horizonDays: number;
  bigPayments: { name: string; amount: number; date: string }[];
  fixedCosts: {
    name: string;
    amount: number;
    category: Category;
    frequency: FixedCostFrequency;
    dueDay: number | null;
    dueDate: string | null;
  }[];
  goal: { name: string; target: number; dueDate: string | null } | null;
};

export type ProfilePayload = {
  name: string;
  paydayDay: number;
  paydayDayEnd?: number;
  nightlyTime: string;
  locale: Locale;
  theme: Theme;
  incomeMode: IncomeMode;
  horizonDays: number;
};

export type IncomeSourcePayload = {
  name: string;
  type: IncomeSourceType;
  frequency: IncomeFrequency | null;
  paydayDay: number | null;
  typicalAmount: number;
};

export type IncomeEventPayload = {
  sourceId: string;
  amount: number;
  date: string;
  note: string;
  status: "received" | "expected";
};

export type BalanceAdjustmentPayload = {
  amount: number;
  note: string;
  date: string;
};

export type FixedCostPayload = {
  name: string;
  amount: number;
  category: Category;
  frequency: FixedCostFrequency;
  dueDay: number | null;
  dueDate: string | null;
};

export type SalaryPayload = {
  sourceId: string;
  amount: number;
  date: string;
};
