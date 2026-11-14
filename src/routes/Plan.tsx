import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Icon } from "../components/Icon";
import { Mascot } from "../components/Mascot";
import { Sheet } from "../components/Sheet";
import { AmountInput, Button, Card, CountUp, SectionHeader } from "../components/ui";
import { PageGuide } from "../components/PageGuide";
import { useI18n } from "../lib/i18n";
import { formatXaf, monthKey } from "../lib/money";
import { buildMonthState } from "../lib/selectors";
import { api, useBootstrap, useRefresh, useToday } from "../lib/store";
import { useToast } from "../components/Toast";
import { useFeatures } from "../lib/features";

export function Plan() {
  const { data } = useBootstrap();
  const today = useToday();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const refresh = useRefresh();
  const { show } = useToast();
  const features = useFeatures();
  const [editing, setEditing] = useState(false);

  const state = useMemo(() => (data ? buildMonthState(data, today) : null), [data, today]);
  const plan = useMemo(
    () => data?.plans.find((item) => item.month === monthKey(today)) ?? data?.plans[0] ?? null,
    [data, today],
  );

  const planned = useMemo(
    () =>
      data
        ? data.planned.filter((item) => item.status === "planned").sort((a, b) => a.date.localeCompare(b.date))
        : [],
    [data],
  );

  const debts = useMemo(() => data?.debts ?? [], [data]);

  if (!data || !state) {
    return <div className="px-5 pt-16"><div className="h-12 w-40 animate-pulse rounded-[12px] bg-soft" /></div>;
  }

  const rows: { label: string; value: number; negative?: boolean }[] = [
    { label: t("plan.income"), value: state.income },
    { label: t("plan.fixedCosts"), value: state.fixedCosts, negative: true },
    { label: t("plan.savings"), value: state.savings, negative: true },
    { label: t("plan.debtPayments"), value: state.debtPayments, negative: true },
    { label: t("plan.wishlist"), value: state.wishlist, negative: true },
  ];

  return (
    <div className="pb-6">
      <header className="pt-safe px-5 pt-12">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold tracking-[0.14em] text-muted">{t("plan.leftThisMonth")}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[15px] font-medium text-accent"
          >
            {t("plan.editPlan")}
          </button>
        </div>
        <p className="mt-1 text-[52px] leading-none font-bold tracking-[-0.03em]">
          <CountUp value={state.left} />
          <span className="ml-1.5 text-[16px] font-semibold text-muted">XAF</span>
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-4 px-5">
        <PageGuide
          id="plan"
          title={t("plan.title")}
          steps={[
            { title: t("plan.guideStep1Title"), body: t("plan.guideStep1Body") },
            { title: t("plan.guideStep2Title"), body: t("plan.guideStep2Body") },
            { title: t("plan.guideStep3Title"), body: t("plan.guideStep3Body") },
          ]}
        />
        <Card className="overflow-hidden px-4 py-1">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-3 hairline-b last:border-b-0">
              <span className="text-[16px]">{row.label}</span>
              <span className="text-[16px] font-semibold tnum">
                {row.negative ? "− " : ""}
                {formatXaf(row.value)}
              </span>
            </div>
          ))}
        </Card>

        <Card tint className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="text-[16px] font-bold">{t("plan.dailyAllowance")}</p>
            <p className="text-[13px] text-muted">
              {t("plan.dailyAllowanceHint", {
                amount: formatXaf(state.free),
                days: state.daysRemaining,
              })}
            </p>
          </div>
          <span className="ml-3 shrink-0 rounded-full bg-gold px-3 py-1 text-[17px] font-bold text-gold-ink tnum">
            {formatXaf(state.allowance)}
          </span>
        </Card>

        {features.simulator ? (
          <button
            type="button"
            onClick={() => navigate("/simulator")}
            className="flex w-full items-center gap-3 rounded-[20px] bg-surface p-4 text-left shadow-card active:scale-[0.99]"
          >
            <Mascot pose="details" size={72} />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold">{t("plan.simulator")}</p>
              <p className="mt-0.5 text-[13px] text-muted">{t("plan.simulatorBody")}</p>
            </div>
            <Icon name="chevronRight" size={20} className="text-muted" />
          </button>
        ) : null}

        {features.simulator ? (
          <>
            <SectionHeader
              title={t("plan.plannedSpending")}
              action={
                <Link to="/simulator" className="text-[14px] font-medium text-accent">
                  {t("common.add")}
                </Link>
              }
            />
            <Card className="overflow-hidden">
              {planned.length ? (
                planned.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 hairline-b last:border-b-0">
                    <span
                      className="h-10 w-10 shrink-0 rounded-[13px]"
                      style={{
                        background:
                          item.category === "Food"
                            ? "var(--cat-food)"
                            : item.category === "Transport"
                              ? "var(--cat-transport)"
                              : item.category === "Airtime"
                                ? "var(--cat-airtime)"
                                : item.category === "Clothes"
                                  ? "var(--cat-clothes)"
                                  : item.category === "Social"
                                    ? "var(--cat-social)"
                                    : "var(--cat-other)",
                      }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-medium">{item.name}</p>
                      <p className="text-[13px] text-muted">
                        {new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
                          day: "numeric",
                          month: "short",
                          timeZone: "UTC",
                        }).format(new Date(`${item.date}T12:00:00Z`))}
                      </p>
                    </div>
                    <span className="text-[16px] font-semibold tnum">{formatXaf(item.amount)}</span>
                    <button
                      type="button"
                      aria-label={`${t("common.remove")} ${item.name}`}
                      onClick={async () => {
                        await api.deletePlanned(item.id);
                        await refresh();
                        show(t("common.saved"));
                      }}
                      className="grid h-11 w-11 place-items-center text-muted"
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-4 py-5 text-[14px] text-muted">{t("plan.nothingPlanned")}</p>
              )}
            </Card>
          </>
        ) : null}

        {features.debts ? (
          <>
            <SectionHeader
              title={t("plan.debts")}
              action={
                <Link to="/debts" className="text-[14px] font-medium text-accent">
                  {t("common.all")}
                </Link>
              }
            />
            <Card className="overflow-hidden">
              {debts.length ? (
                debts.map((debt) => {
                  const payments = data.payments.filter((payment) => payment.debt_id === debt.id);
                  const paid = payments.filter((payment) => payment.paid_at).length;
                  const next = payments.find((payment) => !payment.paid_at);
                  return (
                    <div key={debt.id} className="px-4 py-3 hairline-b last:border-b-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[16px] font-medium">{debt.person}</p>
                        <span className="rounded-full bg-gold/20 px-2.5 py-1 text-[12px] font-semibold text-gold-ink">
                          {debt.direction === "owe" ? t("debts.iOwe") : t("debts.owedToMe")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-muted">
                        {t("debts.progress", { paid, count: debt.installments })} ·{" "}
                        {t("debts.eachAmount", { amount: formatXaf(payments[0]?.amount ?? 0) })}
                      </p>
                      {next ? (
                        <Button
                          size="md"
                          variant="outline"
                          className="mt-2.5"
                          onClick={async () => {
                            await api.payDebt(debt.id);
                            await refresh();
                            show(t("common.saved"));
                          }}
                        >
                          {t("plan.recordPayment", { amount: formatXaf(next.amount) })}
                        </Button>
                      ) : (
                        <p className="mt-2 text-[13px] font-medium text-success">{t("plan.allPaid")}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="px-4 py-5 text-[14px] text-muted">{t("debts.noDebts")}</p>
              )}
            </Card>
          </>
        ) : null}

        <Link to="/settings/reminders">
          <Button full variant="outline">
            <Icon name="bell" size={18} />
            {t("plan.reminders")}
          </Button>
        </Link>
      </div>

      <EditPlanSheet
        open={editing}
        onClose={() => setEditing(false)}
        income={plan?.income ?? 0}
        savings={plan?.savings_target ?? 0}
        wishlist={plan?.wishlist_budget ?? 0}
        onSave={async (next) => {
          await api.savePlan({
            month: monthKey(today),
            income: next.income,
            savingsTarget: next.savings,
            wishlistBudget: next.wishlist,
          });
          await refresh();
          setEditing(false);
          show(t("common.saved"));
        }}
      />
    </div>
  );
}

function EditPlanSheet({
  open,
  onClose,
  income,
  savings,
  wishlist,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  income: number;
  savings: number;
  wishlist: number;
  onSave: (next: { income: number; savings: number; wishlist: number }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [incomeValue, setIncomeValue] = useState(String(income));
  const [savingsValue, setSavingsValue] = useState(String(savings));
  const [wishlistValue, setWishlistValue] = useState(String(wishlist));

  return (
    <Sheet open={open} onClose={onClose} title={t("plan.monthlyPlan")}>
      <div className="flex flex-col gap-4 pb-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("plan.income")}</span>
          <AmountInput value={incomeValue} onChange={(e) => setIncomeValue(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("plan.savings")}</span>
          <AmountInput value={savingsValue} onChange={(e) => setSavingsValue(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("plan.wishlist")}</span>
          <AmountInput value={wishlistValue} onChange={(e) => setWishlistValue(e.target.value)} />
        </label>
        <Button
          full
          onClick={() =>
            onSave({
              income: Number(incomeValue.replace(/\D/g, "") || "0"),
              savings: Number(savingsValue.replace(/\D/g, "") || "0"),
              wishlist: Number(wishlistValue.replace(/\D/g, "") || "0"),
            })
          }
        >
          {t("common.save")}
        </Button>
      </div>
    </Sheet>
  );
}
