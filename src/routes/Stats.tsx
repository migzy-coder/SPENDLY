import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { Mascot } from "../components/Mascot";
import { Bars, Card, CountUp, Donut, SectionHeader, Segmented } from "../components/ui";
import { useI18n } from "../lib/i18n";
import { addDays, addMonths, formatXaf } from "../lib/money";
import { buildMonthState } from "../lib/selectors";
import {
  categoryTotals,
  changePercent,
  computeInsights,
  dailyBars,
  dayLabel,
  monthLabel,
  monthRange,
  weekRange,
  weeklyBars,
} from "../lib/stats";
import { useBootstrap, useToday } from "../lib/store";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "var(--cat-food)",
  Transport: "var(--cat-transport)",
  Airtime: "var(--cat-airtime)",
  Clothes: "var(--cat-clothes)",
  Social: "var(--cat-social)",
  Other: "var(--cat-other)",
};

export function Stats() {
  const { data } = useBootstrap();
  const today = useToday();
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<"week" | "month">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const state = useMemo(() => (data ? buildMonthState(data, today) : null), [data, today]);

  const anchorDate = useMemo(() => {
    if (mode === "week") {
      const base = weekRange(today).from;
      return addDays(base, weekOffset * 7);
    }
    return addMonths(`${today.slice(0, 7)}-01`, monthOffset).slice(0, 8) + "01";
  }, [mode, today, weekOffset, monthOffset]);

  const range = useMemo(() => (mode === "week" ? weekRange(anchorDate) : monthRange(anchorDate)), [mode, anchorDate]);

  const entries = useMemo(
    () => (data ? data.entries.filter((entry) => entry.date >= range.from && entry.date <= range.to) : []),
    [data, range],
  );
  const planned = useMemo(
    () => (data ? data.planned.filter((item) => item.date >= range.from && item.date <= range.to) : []),
    [data, range],
  );

  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

  const previous = useMemo(() => {
    if (mode === "week") {
      const base = weekRange(addDays(range.from, -7)).from;
      return { from: base, to: addDays(base, 6) };
    }
    const first = `${range.from.slice(0, 7)}-01`;
    const previousMonth = addMonths(first, -1).slice(0, 7);
    return { from: `${previousMonth}-01`, to: `${previousMonth}-28` };
  }, [mode, range]);

  const previousEntries = useMemo(
    () => (data ? data.entries.filter((entry) => entry.date >= previous.from && entry.date <= previous.to) : []),
    [data, previous],
  );

  const previousTotal = useMemo(() => {
    if (mode === "week") return previousEntries.reduce((sum, entry) => sum + entry.amount, 0);
    // Same number of days as the current month, so the comparison is fair.
    const dayCount = Number(range.to.slice(8, 10));
    const cutoff = `${previous.from.slice(0, 7)}-${String(dayCount).padStart(2, "0")}`;
    return previousEntries
      .filter((entry) => entry.date <= cutoff)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }, [mode, previousEntries, previous.from, range.to]);

  const change = changePercent(total, previousTotal);

  const insights = useMemo(
    () => computeInsights(data?.entries ?? [], state?.free ?? 0, state?.daysRemaining ?? 0),
    [data, state],
  );

  const bars = useMemo(() => dailyBars(entries, planned, range, today, locale), [entries, planned, range, today, locale]);
  const monthBars = useMemo(() => weeklyBars(entries, range, today), [entries, range, today]);
  const slices = useMemo(
    () => categoryTotals(entries).map((item) => ({ color: CATEGORY_COLORS[item.category], amount: item.amount })),
    [entries],
  );
  const categoryList = useMemo(() => categoryTotals(entries), [entries]);

  const monthsList = useMemo(() => {
    if (!data) return [];
    const list: { key: string; total: number }[] = [];
    for (let index = 5; index >= 0; index -= 1) {
      const key = addMonths(`${today.slice(0, 7)}-01`, -index).slice(0, 7);
      const sum = data.entries
        .filter((entry) => entry.date.startsWith(key))
        .reduce((total, entry) => total + entry.amount, 0);
      list.push({ key, total: sum });
    }
    return list;
  }, [data, today]);

  if (!data || !state) {
    return <div className="px-5 pt-16"><div className="h-10 w-32 animate-pulse rounded-[12px] bg-soft" /></div>;
  }

  const canGoNext = mode === "week" ? weekOffset < 0 : monthOffset < 0;
  const average = entries.length ? Math.round(total / Math.max(1, new Set(entries.map((e) => e.date)).size)) : 0;
  const biggest = entries.reduce(
    (best, entry) => (entry.amount > best.amount ? entry : best),
    { amount: 0, date: "" },
  );

  return (
    <div className="pb-6">
      <header className="pt-safe px-5 pt-12">
        <Segmented
          value={mode}
          onChange={(value) => setMode(value)}
          options={[
            { value: "week", label: t("stats.perWeek") },
            { value: "month", label: t("stats.perMonth") },
          ]}
        />
      </header>

      <div className="mt-4 flex flex-col gap-4 px-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label={mode === "week" ? "Previous week" : "Previous month"}
            onClick={() => (mode === "week" ? setWeekOffset((value) => value - 1) : setMonthOffset((value) => value - 1))}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface shadow-card active:scale-95"
          >
            <Icon name="chevronLeft" size={20} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[12px] font-semibold tracking-[0.14em] text-muted">
              {mode === "week"
                ? weekOffset === 0
                  ? t("stats.thisWeek")
                  : t("stats.week").toUpperCase()
                : monthOffset === 0
                  ? t("stats.thisMonth")
                  : t("stats.month_label").toUpperCase()}
            </p>
            <p className="mt-0.5 text-[13px] text-muted">
              {mode === "week"
                ? `${dayLabel(range.from, locale)} ${Number(range.from.slice(8, 10))} ${monthLabel(range.from, locale)} – ${Number(range.to.slice(8, 10))} ${monthLabel(range.to, locale)}`
                : `${monthLabel(range.from, locale)} ${range.from.slice(0, 4)}`}
            </p>
            <p className="mt-1 text-[38px] leading-none font-bold tracking-[-0.03em]">
              <CountUp value={total} />
            </p>
          </div>
          <button
            type="button"
            aria-label={mode === "week" ? "Next week" : "Next month"}
            disabled={!canGoNext}
            onClick={() => (mode === "week" ? setWeekOffset((value) => value + 1) : setMonthOffset((value) => value + 1))}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface shadow-card active:scale-95 disabled:opacity-35"
          >
            <Icon name="chevronRight" size={20} />
          </button>
        </div>

        <div className="flex justify-center">
          <span className="rounded-full bg-surface px-4 py-2 text-[13px] font-semibold shadow-card">
            {change === null
              ? t("stats.noChange")
              : t(mode === "week" ? "stats.versusPrevious" : "stats.versusPreviousMonth", {
                  percent: `${Math.abs(change)}%`,
                  direction: change >= 0 ? "+" : "−",
                })}
          </span>
        </div>

        {mode === "week" ? (
          <Bars
            data={bars.map((bar) => ({
              label: bar.label,
              value: bar.isFuture ? bar.planned : bar.value,
              tone: bar.isFuture ? ("planned" as const) : bar.isToday ? ("accent" as const) : ("muted" as const),
            }))}
          />
        ) : (
          <Bars
            data={monthBars.map((bar) => ({
              label: bar.label,
              value: bar.value,
              tone: bar.isFuture ? ("planned" as const) : ("muted" as const),
            }))}
          />
        )}

        {mode === "month" ? (
          <>
            <Card className="grid grid-cols-2 gap-3 p-4">
              <div>
                <p className="text-[13px] text-muted">{t("stats.averagePerDay")}</p>
                <p className="text-[20px] font-bold tnum">{formatXaf(average)}</p>
              </div>
              <div>
                <p className="text-[13px] text-muted">{t("stats.biggestDay")}</p>
                <p className="text-[20px] font-bold tnum">
                  {biggest.date ? formatXaf(biggest.amount) : "—"}
                </p>
              </div>
            </Card>

            <SectionHeader title={t("stats.compareMonths")} />
            <Card className="p-4">
              <Bars
                height={110}
                data={monthsList.map((item) => ({
                  label: monthLabel(`${item.key}-01`, locale),
                  value: item.total,
                  tone: selectedMonth === item.key ? ("accent" as const) : ("muted" as const),
                }))}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {monthsList.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedMonth(selectedMonth === item.key ? null : item.key)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                      selectedMonth === item.key ? "bg-accent text-white" : "bg-soft"
                    }`}
                  >
                    {monthLabel(`${item.key}-01`, locale)} {item.key.slice(0, 4)}
                  </button>
                ))}
              </div>
            </Card>
          </>
        ) : null}

        <SectionHeader title={t("goals.smallSteps")} />
        <Card className="flex items-center gap-3 p-4">
          <Mascot pose="reports" size={86} />
          <div className="min-w-0 flex-1">
            {insights.loggedDays >= 7 ? (
              <>
                <p className="text-[15px] font-bold">
                  {insights.weekendPercent === null
                    ? t("stats.needDays")
                    : t("stats.weekendInsight", {
                        percent: `${Math.abs(insights.weekendPercent)}%`,
                        direction: insights.weekendPercent >= 0 ? "+" : "−",
                      })}
                </p>
                {insights.projection !== null ? (
                  <p className="mt-1 text-[13px] text-muted">
                    {t("stats.projection", { amount: formatXaf(Math.max(0, insights.projection)) })}
                  </p>
                ) : null}
                <p className="mt-1 text-[13px] text-muted">
                  {t("stats.smallPurchases", { amount: formatXaf(insights.smallPurchases) })}
                </p>
              </>
            ) : (
              <p className="text-[15px] font-bold">{t("stats.needDays")}</p>
            )}
          </div>
        </Card>

        <SectionHeader title={t("stats.byCategory")} />
        <Card className="p-4">
          {total ? (
            <div className="flex items-center gap-4">
              <Donut slices={slices} centerLabel={formatXaf(total)} />
              <ul className="min-w-0 flex-1">
                {categoryList.map((item) => (
                  <li key={item.category} className="flex items-center justify-between py-1 text-[14px]">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: CATEGORY_COLORS[item.category] }}
                        aria-hidden="true"
                      />
                      {t(`categories.${item.category.toLowerCase()}`)}
                    </span>
                    <span className="font-semibold tnum">{Math.round((item.amount / total) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[14px] text-muted">{t("stats.noSpending")}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
