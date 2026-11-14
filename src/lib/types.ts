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
};

export type SetupPayload = {
  name: string;
  paydayDay: number;
  paydayDayEnd?: number;
  nightlyTime: string;
  locale: Locale;
  income: number;
  savingsTarget: number;
  wishlistBudget: number;
  month: string;
  fixedCosts: { name: string; amount: number }[];
  goal: { name: string; target: number; dueDate: string | null } | null;
};

export type PlanPayload = {
  month: string;
  income: number;
  savingsTarget: number;
  wishlistBudget: number;
};

export type ProfilePayload = {
  name: string;
  paydayDay: number;
  paydayDayEnd?: number;
  nightlyTime: string;
  locale: Locale;
  theme: Theme;
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
