import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Mascot } from "../components/Mascot";
import { Icon } from "../components/Icon";
import { Button, Card, CountUp, SectionHeader, Tag, cn } from "../components/ui";
import { useI18n } from "../lib/i18n";
import { CATEGORIES, formatXaf } from "../lib/money";
import { api, useBootstrap, useRefresh, useToday } from "../lib/store";
import { buildMonthState, entriesForDay } from "../lib/selectors";
import { useState } from "react";
import { useToast } from "../components/Toast";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "var(--cat-food)",
  Transport: "var(--cat-transport)",
  Airtime: "var(--cat-airtime)",
  Clothes: "var(--cat-clothes)",
  Social: "var(--cat-social)",
  Other: "var(--cat-other)",
};

function greetingKey(hour: number): "today.greetingMorning" | "today.greetingAfternoon" | "today.greetingEvening" {
  if (hour < 12) return "today.greetingMorning";
  if (hour < 18) return "today.greetingAfternoon";
  return "today.greetingEvening";
}

export function Today() {
  const { data } = useBootstrap();
  const today = useToday();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const refresh = useRefresh();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  const state = useMemo(() => (data ? buildMonthState(data, today) : null), [data, today]);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Douala" }).format(new Date()),
  );

  const todayPlans = useMemo(
    () => (data ? data.planned.filter((item) => item.status === "planned" && item.date === today) : []),
    [data, today],
  );
  const upcoming = useMemo(
    () =>
      data
        ? data.planned
            .filter((item) => item.status === "planned" && item.date > today)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 4)
        : [],
    [data, today],
  );
  const todayEntries = useMemo(() => (data ? entriesForDay(data.entries, today) : []), [data, today]);

  const categoryTotals = useMemo(() => {
    if (!state) return [];
    return CATEGORIES.map((category) => ({ category, amount: state.byCategory[category] })).filter(
      (item) => item.amount > 0,
    );
  }, [state]);

  const totalSpent = categoryTotals.reduce((sum, item) => sum + item.amount, 0);

  const completePlan = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.completePlanned(id);
      await refresh();
      show(t("today.onTrack"));
    } finally {
      setBusy(false);
    }
  };

  const postponePlan = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = new Date(`${today}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      await api.postponePlanned(id, next.toISOString().slice(0, 10));
      await refresh();
      show(t("common.saved"));
    } finally {
      setBusy(false);
    }
  };

  if (!data || !state) {
    return (
      <div className="px-5 pt-16">
        <div className="h-9 w-40 animate-pulse rounded-[10px] bg-soft" />
        <div className="mt-6 h-16 w-52 animate-pulse rounded-[14px] bg-soft" />
      </div>
    );
  }

  const firstName = data.user?.name?.split(" ")[0] || "";
  const segments = categoryTotals.map((item) => ({
    key: item.category,
    amount: item.amount,
    color: CATEGORY_COLORS[item.category],
  }));

  return (
    <div className="pb-6">
      <header className="pt-safe px-5 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] text-muted">{t(greetingKey(hour))}</p>
            <h1 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">{firstName}</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/calendar")}
            aria-label={t("calendar.title")}
            className="grid h-11 w-11 place-items-center rounded-full bg-surface shadow-card active:scale-95"
          >
            <Icon name="calendar" size={21} />
          </button>
        </div>

        <p className="mt-6 text-[12px] font-semibold tracking-[0.14em] text-muted">{t("today.leftToSpend")}</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="text-[52px] leading-none font-bold tracking-[-0.03em]">
            <CountUp value={state.leftToSpend} />
            <span className="ml-1.5 text-[16px] font-semibold text-muted">XAF</span>
          </p>
          <p className="pb-1 text-right text-[13px] text-muted">
            {t("today.spentOf", { spent: formatXaf(state.spent), total: formatXaf(state.income) })}
          </p>
        </div>

        <div className="mt-3 flex h-2.5 gap-1 overflow-hidden rounded-full">
          {segments.map((segment) => (
            <span
              key={segment.key}
              style={{ flex: segment.amount, background: segment.color }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          ))}
          <span style={{ flex: Math.max(state.leftToSpend, 1) }} className="h-full rounded-full bg-hairline" />
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-[14px] font-semibold text-gold-ink">
          <Icon name="wallet" size={16} />
          {state.daysRemaining
            ? t("today.allowanceToday", { amount: formatXaf(state.allowance) })
            : t("today.allowanceNone")}
        </div>
      </header>

      <div className="mt-5 flex flex-col gap-4 px-5">
        <Card className="flex items-center gap-3 p-4">
          <Mascot pose="home" size={84} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold">{state.overBudget ? t("today.overBudget") : t("today.onTrack")}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">
              {state.overBudget
                ? t("today.overBudgetBody")
                : t("today.onTrackBody", { amount: formatXaf(state.plannedRemaining) })}
            </p>
          </div>
        </Card>

        {todayPlans.map((plan) => (
          <Card key={plan.id} tint className="p-4">
            <div className="flex items-center gap-3">
              <Mascot pose="add-expense" size={70} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-bold">{plan.name}</p>
                <p className="text-[13px] text-muted">
                  {t("today.plannedForToday", { amount: formatXaf(plan.amount) })}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="md" className="flex-1" onClick={() => completePlan(plan.id)} disabled={busy}>
                {t("today.yesIDidIt")}
              </Button>
              <Button size="md" variant="outline" className="flex-1" onClick={() => postponePlan(plan.id)} disabled={busy}>
                {t("today.notToday")}
              </Button>
            </div>
          </Card>
        ))}

        <button
          type="button"
          onClick={() => navigate("/simulator")}
          className="flex w-full items-center gap-3 rounded-[20px] bg-surface p-4 text-left shadow-card active:scale-[0.99]"
        >
          <Mascot pose="details" size={72} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold">{t("today.canIAfford")}</p>
            <p className="mt-0.5 text-[13px] text-muted">{t("today.canIAffordBody")}</p>
          </div>
          <Icon name="chevronRight" size={20} className="text-muted" />
        </button>

        <SectionHeader
          title={t("today.whereItWent")}
          action={<span className="text-[13px] text-muted">{t("today.categories", { count: categoryTotals.length })}</span>}
        />
        {categoryTotals.length ? (
          <div className="flex flex-col gap-2.5">
            {categoryTotals.map((item) => (
              <div
                key={item.category}
                className="rounded-[22px] px-4 py-3.5 text-white shadow-[0_8px_20px_rgba(60,50,30,0.12)]"
                style={{ background: CATEGORY_COLORS[item.category], color: item.category === "Clothes" ? "var(--cat-ink-clothes)" : "#fff" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[17px] font-bold">{t(`categories.${item.category.toLowerCase()}`)}</span>
                  <span className="text-[17px] font-bold tnum">{formatXaf(item.amount)}</span>
                </div>
                <p className="mt-0.5 text-[13px] opacity-90">
                  {totalSpent ? Math.round((item.amount / totalSpent) * 100) : 0}% {t("common.of").toLowerCase()} {t("today.whereItWent").toLowerCase()}
                </p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full rounded-full bg-white/70"
                    style={{ width: `${totalSpent ? (item.amount / totalSpent) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center gap-2 p-6 text-center">
            <Mascot pose="empty" size={130} />
            <p className="text-[15px] font-semibold">{t("today.noEntries")}</p>
          </Card>
        )}

        <SectionHeader title={t("today.comingUp")} />
        <Card className="p-4">
          {upcoming.length ? (
            <div className="flex flex-col gap-3">
              {upcoming.map((plan) => (
                <div key={plan.id} className="flex items-center gap-3">
                  <span
                    className="h-9 w-9 shrink-0 rounded-[12px]"
                    style={{ background: CATEGORY_COLORS[plan.category] }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{plan.name}</p>
                    <p className="text-[13px] text-muted">
                      {new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      }).format(new Date(`${plan.date}T12:00:00Z`))}
                    </p>
                  </div>
                  <span className="text-[15px] font-semibold tnum">{formatXaf(plan.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-muted">{t("today.noComingUp")}</p>
          )}
        </Card>

        <SectionHeader
          title={t("today.recent")}
          action={
            <Link to="/activity" className="text-[14px] font-medium text-accent">
              {t("activity.title")}
            </Link>
          }
        />
        <Card className="overflow-hidden">
          {todayEntries.length ? (
            todayEntries.map((entry) => (
              <Link
                key={entry.id}
                to={`/activity/${entry.id}`}
                className="flex items-center gap-3 px-4 py-3 hairline-b last:border-b-0"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-[16px] font-bold text-white"
                  style={{
                    background: CATEGORY_COLORS[entry.category],
                    color: entry.category === "Clothes" ? "var(--cat-ink-clothes)" : "#fff",
                  }}
                  aria-hidden="true"
                >
                  {entry.category.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-medium">{t(`categories.${entry.category.toLowerCase()}`)}</p>
                  {entry.note ? <p className="truncate text-[13px] text-muted">{entry.note}</p> : null}
                </div>
                <span className="text-[16px] font-semibold tnum">{formatXaf(entry.amount)}</span>
              </Link>
            ))
          ) : (
            <p className="px-4 py-5 text-[14px] text-muted">{t("today.noEntries")}</p>
          )}
        </Card>

        {state.streak > 1 ? (
          <div className="flex justify-center">
            <Tag tone="gold">{t("today.streak", { count: state.streak })}</Tag>
          </div>
        ) : null}

        <p className={cn("text-center text-[12px] text-muted")}>
          {t("settings.storageNote")} · <Link to="/settings" className="text-accent">{t("settings.title")}</Link>
        </p>
      </div>
    </div>
  );
}
