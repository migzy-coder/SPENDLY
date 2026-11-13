import { useMemo, useState } from "react";
import { NavBar } from "../components/NavBar";
import { Mascot } from "../components/Mascot";
import { Card, SectionHeader, Tag } from "../components/ui";
import { useI18n } from "../lib/i18n";
import { addDays, daysInMonth, formatXaf } from "../lib/money";
import { entriesForDay, plannedForDay } from "../lib/selectors";
import { useBootstrap, useToday } from "../lib/store";

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

export function Calendar() {
  const { data } = useBootstrap();
  const today = useToday();
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState(today);

  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const total = daysInMonth(today);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const paydayDay = data?.user?.payday_day ?? 25;

  const cells = useMemo(() => {
    const list: (string | null)[] = [];
    for (let index = 0; index < firstWeekday; index += 1) list.push(null);
    let cursor = `${year}-${String(month).padStart(2, "0")}-01`;
    for (let day = 1; day <= total; day += 1) {
      list.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return list;
  }, [firstWeekday, total, year, month]);

  const dayEntries = useMemo(() => (data ? entriesForDay(data.entries, selected) : []), [data, selected]);
  const dayPlanned = useMemo(() => (data ? plannedForDay(data.planned, selected) : []), [data, selected]);

  const spentByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of data?.entries ?? []) {
      map.set(entry.date, (map.get(entry.date) ?? 0) + entry.amount);
    }
    return map;
  }, [data]);

  const plannedByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data?.planned ?? []) {
      if (item.status !== "planned") continue;
      map.set(item.date, (map.get(item.date) ?? 0) + item.amount);
    }
    return map;
  }, [data]);

  const monthTotal = useMemo(
    () =>
      (data?.entries ?? [])
        .filter((entry) => entry.date.startsWith(`${year}-${String(month).padStart(2, "0")}`))
        .reduce((sum, entry) => sum + entry.amount, 0),
    [data, year, month],
  );

  const monthLabel = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${year}-${String(month).padStart(2, "0")}-01T12:00:00Z`));

  return (
    <div className="pb-6">
      <NavBar title={monthLabel} backLabel={t("nav.today")} />

      <div className="flex flex-col gap-4 px-5 pt-2">
        <Card className="flex items-center gap-3 p-4">
          <Mascot pose="calendar" size={86} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold">{formatXaf(monthTotal)} XAF</p>
            <p className="mt-0.5 text-[13px] text-muted">{t("calendar.plannedMark")}</p>
          </div>
        </Card>

        <Card className="p-3">
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day, index) => (
              <span key={`${day}-${index}`} className="pb-1 text-[12px] font-medium text-muted">
                {day}
              </span>
            ))}
            {cells.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} />;
              const day = Number(date.slice(8, 10));
              const spent = spentByDay.get(date) ?? 0;
              const planned = plannedByDay.get(date) ?? 0;
              const isToday = date === today;
              const isPayday = day === paydayDay;
              const isSelected = date === selected;
              const isFuture = date > today;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(date)}
                  aria-label={`${day}`}
                  className={`flex min-h-[52px] flex-col items-center justify-center rounded-[14px] text-[15px] ${
                    isToday
                      ? "bg-accent text-white"
                      : isPayday
                        ? "bg-gold text-gold-ink"
                        : isSelected
                          ? "outline-2 outline-accent"
                          : ""
                  }`}
                >
                  <span className={isToday ? "text-white" : ""}>{day}</span>
                  <small className="text-[10px] leading-tight">
                    {isPayday && !isToday
                      ? t("calendar.payday")
                      : spent
                        ? `${Math.round(spent / 100) / 10}k`
                        : isFuture && planned
                          ? `~${Math.round(planned / 100) / 10}k`
                          : "·"}
                  </small>
                </button>
              );
            })}
          </div>
        </Card>

        <SectionHeader
          title={new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          }).format(new Date(`${selected}T12:00:00Z`))}
        />

        <Card className="overflow-hidden">
          {dayEntries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hairline-b last:border-b-0">
              <span className="h-10 w-10 shrink-0 rounded-[13px] bg-soft" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-medium">{t(`categories.${entry.category.toLowerCase()}`)}</p>
                {entry.note ? <p className="truncate text-[13px] text-muted">{entry.note}</p> : null}
              </div>
              <span className="text-[16px] font-semibold tnum">− {formatXaf(entry.amount)}</span>
            </div>
          ))}
          {dayPlanned.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 hairline-b last:border-b-0">
              <span className="h-10 w-10 shrink-0 rounded-[13px] bg-gold/30" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-medium">{item.name}</p>
              </div>
              <Tag tone="gold">{t("plan.plannedSpending")}</Tag>
              <span className="text-[16px] font-semibold tnum">{formatXaf(item.amount)}</span>
            </div>
          ))}
          {!dayEntries.length && !dayPlanned.length ? (
            <p className="px-4 py-5 text-[14px] text-muted">
              {selected > today ? t("calendar.nothingPlanned") : t("calendar.noSpending")}
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
