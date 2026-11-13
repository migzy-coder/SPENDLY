import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Mascot } from "../components/Mascot";
import { NavBar } from "../components/NavBar";
import { Button, Card, Capsule, Input, ProgressBar, Tag } from "../components/ui";
import { useToast } from "../components/Toast";
import { useI18n } from "../lib/i18n";
import { addDays, daysInMonth, formatXaf, simulatorVerdict } from "../lib/money";
import { buildMonthState } from "../lib/selectors";
import { api, useBootstrap, useRefresh, useToday } from "../lib/store";
import type { Category } from "../lib/types";

const PRESETS: { key: string; label: string; category: Category; lines: { name: string; amount: number }[] }[] = [
  {
    key: "cinema",
    label: "Cinéma",
    category: "Social",
    lines: [
      { name: "Ticket", amount: 3000 },
      { name: "Snacks", amount: 2000 },
      { name: "Transport", amount: 1500 },
    ],
  },
  {
    key: "restaurant",
    label: "Restaurant",
    category: "Food",
    lines: [
      { name: "Repas", amount: 6000 },
      { name: "Boissons", amount: 2000 },
      { name: "Transport", amount: 1500 },
    ],
  },
  {
    key: "trip",
    label: "Voyage",
    category: "Transport",
    lines: [
      { name: "Transport", amount: 8000 },
      { name: "Repas", amount: 4000 },
    ],
  },
  {
    key: "shopping",
    label: "Shopping",
    category: "Clothes",
    lines: [{ name: "Article", amount: 10000 }],
  },
  {
    key: "other",
    label: "Autre",
    category: "Other",
    lines: [{ name: "Coût", amount: 5000 }],
  },
];

const EXTRA_LINES = ["Ticket", "Snacks", "Repas", "Transport", "Cadeau", "Autre"];

export function Simulator() {
  const { data } = useBootstrap();
  const today = useToday();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const refresh = useRefresh();
  const { show } = useToast();

  const [presetKey, setPresetKey] = useState(PRESETS[0].key);
  const [lines, setLines] = useState(PRESETS[0].lines);
  const [day, setDay] = useState(today);

  const state = useMemo(() => (data ? buildMonthState(data, today) : null), [data, today]);

  const days = useMemo(() => {
    const last = daysInMonth(today);
    const list: string[] = [];
    let cursor = today;
    const todayDay = Number(today.slice(8, 10));
    for (let index = 0; index < last - todayDay + 1; index += 1) {
      list.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return list;
  }, [today]);

  const total = lines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const freeBefore = state?.free ?? 0;
  const freeAfter = freeBefore - total;
  const verdict = simulatorVerdict(freeBefore, total);
  const allowanceBefore = state?.allowance ?? 0;
  const allowanceAfter = state
    ? Math.max(
        0,
        Math.floor(
          Math.max(0, freeAfter) / Math.max(1, state.daysRemaining) / 100,
        ) * 100,
      )
    : 0;

  const dayLabel = (date: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
      weekday: "short",
      day: "numeric",
      timeZone: "UTC",
    })
      .format(new Date(`${date}T12:00:00Z`))
      .replace(".", "");

  if (!state) {
    return (
      <div>
        <NavBar title={t("simulator.title")} />
      </div>
    );
  }

  const verdictContent = {
    fits: { pose: "success" as const, tag: "success" as const, title: t("simulator.fits"), body: t("simulator.fitsBody") },
    tight: { pose: "details" as const, tag: "gold" as const, title: t("simulator.tight"), body: t("simulator.tightBody") },
    over: { pose: "error" as const, tag: "danger" as const, title: t("simulator.over"), body: t("simulator.overBody") },
  }[verdict];

  const preset = PRESETS.find((item) => item.key === presetKey) ?? PRESETS[0];

  return (
    <div className="pb-6">
      <NavBar title={t("simulator.title")} subtitle={t("simulator.intro")} />

      <div className="flex flex-col gap-4 px-5 pt-2">
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">{t("simulator.activity")}</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((item) => (
              <Capsule
                key={item.key}
                selected={presetKey === item.key}
                onClick={() => {
                  setPresetKey(item.key);
                  setLines(item.lines);
                }}
              >
                {item.label}
              </Capsule>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">{t("simulator.costs")}</p>
          <Card className="flex flex-col gap-2 p-3">
            {lines.map((line, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-[15px]">{line.name}</span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={line.amount ? String(line.amount) : ""}
                  aria-label={line.name}
                  onChange={(event) =>
                    setLines((list) =>
                      list.map((item, position) =>
                        position === index
                          ? { ...item, amount: Number(event.target.value.replace(/\D/g, "") || "0") }
                          : item,
                      ),
                    )
                  }
                  className="h-11 flex-1 text-right"
                />
                <button
                  type="button"
                  aria-label={`${t("common.remove")} ${line.name}`}
                  onClick={() => setLines((list) => list.filter((_, position) => position !== index))}
                  className="grid h-11 w-11 shrink-0 place-items-center text-muted"
                >
                  <span aria-hidden="true" className="text-[20px] leading-none">
                    ×
                  </span>
                </button>
              </div>
            ))}
            <div className="mt-1 flex flex-wrap gap-2">
              {EXTRA_LINES.map((name) => (
                <Capsule key={name} onClick={() => setLines((list) => [...list, { name, amount: 2000 }])}>
                  + {name}
                </Capsule>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">{t("simulator.whichDay")}</p>
          <div className="app-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {days.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => setDay(date)}
                className={`flex h-[62px] w-[52px] shrink-0 flex-col items-center justify-center rounded-[16px] text-[12px] ${
                  day === date ? "bg-accent text-white" : "bg-soft text-muted"
                }`}
              >
                <span>{dayLabel(date).split(" ")[0]}</span>
                <span className="text-[17px] font-bold">{Number(date.slice(8, 10))}</span>
              </button>
            ))}
          </div>
        </div>

        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <Mascot pose={verdictContent.pose} size={92} />
            <div className="min-w-0 flex-1">
              <Tag tone={verdictContent.tag}>{verdictContent.title}</Tag>
              <p className="mt-1.5 text-[13px] leading-snug text-muted">{verdictContent.body}</p>
            </div>
          </div>

          <ProgressBar
            percent={freeBefore > 0 ? Math.min(100, (total / freeBefore) * 100) : 100}
            color={
              verdict === "over"
                ? "var(--app-danger)"
                : verdict === "tight"
                  ? "var(--app-gold)"
                  : "var(--app-success)"
            }
          />

          <div className="flex items-center justify-between">
            <span className="text-[15px] text-muted">{t("simulator.total")}</span>
            <span className="text-[16px] font-bold tnum">{formatXaf(total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[15px] text-muted">{t("simulator.freeBefore")}</span>
            <span className="text-[16px] font-semibold tnum">{formatXaf(freeBefore)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[15px] text-muted">{t("simulator.freeAfter")}</span>
            <span
              className="text-[16px] font-bold tnum"
              style={{ color: freeAfter < 0 ? "var(--app-danger)" : undefined }}
            >
              {formatXaf(freeAfter)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[15px] text-muted">{t("simulator.dailyAllowance")}</span>
            <span className="text-[16px] font-semibold tnum">
              {formatXaf(allowanceBefore)} → {formatXaf(allowanceAfter)}
            </span>
          </div>

          <Button
            full
            disabled={!total}
            onClick={async () => {
              await api.createPlanned({
                name: preset.label,
                date: day,
                category: preset.category,
                amount: total,
              });
              await refresh();
              show(t("common.saved"));
              navigate("/today");
            }}
          >
            {verdict === "over" ? t("plan.planItAnyway") : t("plan.addToPlanned")}
          </Button>
        </Card>
      </div>
    </div>
  );
}
