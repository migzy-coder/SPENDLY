import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../lib/i18n";
import { AMOUNT_CHIPS, CATEGORIES, dailyAllowance, formatXaf } from "../lib/money";
import type { Category, PaymentType } from "../lib/types";
import { buildMonthState, usualAmount } from "../lib/selectors";
import { api, useBootstrap, useRefresh, useToday } from "../lib/store";
import { Mascot } from "./Mascot";
import { Sheet } from "./Sheet";
import { Button, Capsule, Card, CountUp, cn, Input } from "./ui";

const PAYMENTS: PaymentType[] = ["Cash", "Transfer", "Mobile Money"];

type Stage = "form" | "done" | "over";

export function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useBootstrap();
  const today = useToday();
  const { t } = useI18n();
  const refresh = useRefresh();

  const [category, setCategory] = useState<Category>("Food");
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [payment, setPayment] = useState<PaymentType>("Cash");
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [busy, setBusy] = useState(false);

  const state = useMemo(() => (data ? buildMonthState(data, today) : null), [data, today]);
  const usual = useMemo(
    () => (data ? usualAmount(data.entries, category, today) : 0),
    [data, category, today],
  );

  useEffect(() => {
    if (!open) return;
    setStage("form");
    setNote("");
    setCustom("");
    setPayment("Cash");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setAmount(usual || AMOUNT_CHIPS[1]);
  }, [open, usual]);

  const effectiveAmount = custom ? Number(custom.replace(/\D/g, "") || "0") : (amount ?? 0);

  const reset = () => {
    setCategory("Food");
    setAmount(AMOUNT_CHIPS[1]);
    setCustom("");
    setNote("");
  };

  const finish = (spentToday: number) => {
    if (!state) return;
    const allowanceAtStart = dailyAllowance(state.free + state.todaySpent, state.daysRemaining);
    setStage(spentToday > allowanceAtStart ? "over" : "done");
    void refresh();
  };

  const save = async () => {
    if (!effectiveAmount || busy) return;
    setBusy(true);
    try {
      await api.createEntry({
        clientId: crypto.randomUUID(),
        date: today,
        category,
        amount: effectiveAmount,
        paymentType: payment,
        note: note.trim(),
      });
      finish(state ? state.todaySpent + effectiveAmount : effectiveAmount);
    } finally {
      setBusy(false);
    }
  };

  const spentNothing = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.logDay(today, true);
      finish(state ? state.todaySpent : 0);
    } finally {
      setBusy(false);
    }
  };

  const sameAsYesterday = async () => {
    if (!data || busy) return;
    const yesterday = new Date(`${today}T12:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const previous = yesterday.toISOString().slice(0, 10);
    const entries = data.entries.filter((entry) => entry.date === previous);
    if (!entries.length) return;
    setBusy(true);
    try {
      for (const entry of entries) {
        await api.createEntry({
          clientId: crypto.randomUUID(),
          date: today,
          category: entry.category,
          amount: entry.amount,
          paymentType: entry.payment_type,
          note: entry.note,
        });
      }
      const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
      finish(state ? state.todaySpent + total : total);
    } finally {
      setBusy(false);
    }
  };

  const tomorrowAllowance = useMemo(() => {
    if (!state) return 0;
    return dailyAllowance(Math.max(0, state.free), Math.max(0, state.daysRemaining - 1));
  }, [state]);

  return (
    <Sheet
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title={stage === "form" ? t("checkin.title") : undefined}
    >
      {stage === "form" ? (
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={spentNothing}
              className="rounded-full bg-soft px-3.5 py-2 text-[14px] font-semibold text-ink active:scale-95"
            >
              {t("checkin.spentNothing")}
            </button>
            <button
              type="button"
              onClick={sameAsYesterday}
              className="rounded-full bg-soft px-3.5 py-2 text-[14px] font-semibold text-ink active:scale-95"
            >
              {t("checkin.sameAsYesterday")}
            </button>
          </div>

          <div>
            <p className="mb-2 px-1 text-[13px] font-medium text-muted">{t("checkin.category")}</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                  className={cn(
                    "h-[52px] rounded-[16px] bg-soft text-[15px] font-medium transition-all active:scale-95",
                    category === item && "border-2 border-accent bg-accent-tint font-bold",
                  )}
                >
                  {t(`categories.${item.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <p className="text-[13px] font-medium text-muted">{t("checkin.amount")}</p>
              {usual ? (
                <p className="text-[12px] text-muted">
                  {t("checkin.typical")} · {t("checkin.typicalAmount", { amount: formatXaf(usual) })}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {AMOUNT_CHIPS.map((chip) => (
                <Capsule
                  key={chip}
                  selected={!custom && amount === chip}
                  onClick={() => {
                    setAmount(chip);
                    setCustom("");
                  }}
                >
                  {chip >= 1000 ? `${chip / 1000}k` : chip}
                </Capsule>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="tel"
                inputMode="numeric"
                placeholder={t("checkin.amount")}
                value={custom}
                aria-label={t("checkin.amount")}
                onChange={(event) => setCustom(event.target.value)}
                className="flex-1"
              />
              {custom ? (
                <button
                  type="button"
                  onClick={() => setCustom("")}
                  className="h-12 rounded-[12px] bg-soft px-4 text-[15px] font-medium"
                >
                  {t("common.cancel")}
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-2 px-1 text-[13px] font-medium text-muted">{t("checkin.payment")}</p>
            <div className="flex gap-2">
              {PAYMENTS.map((item) => (
                <Capsule key={item} selected={payment === item} onClick={() => setPayment(item)}>
                  {t(`payment.${item.toLowerCase().replace(" ", "")}`)}
                </Capsule>
              ))}
            </div>
          </div>

          <Input
            type="text"
            placeholder={t("checkin.notePlaceholder")}
            aria-label={t("checkin.note")}
            value={note}
            maxLength={280}
            onChange={(event) => setNote(event.target.value)}
          />

          <Button full disabled={!effectiveAmount || busy} onClick={save}>
            {t("checkin.save", {
              amount: formatXaf(effectiveAmount),
              category: t(`categories.${category.toLowerCase()}`),
            })}
          </Button>
        </div>
      ) : null}

      {stage === "done" ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Mascot pose="motivational" size={190} />
          <span className="rounded-full bg-gold/20 px-3 py-1 text-[13px] font-semibold text-gold-ink">
            {t("today.streak", { count: state?.streak ?? 0 })}
          </span>
          <h2 className="text-[24px] font-bold tracking-tight">{t("checkin.dayLogged")}</h2>
          <p className="max-w-[260px] text-[14px] text-muted">
            {t("checkin.dayLoggedBody", { amount: formatXaf(tomorrowAllowance) })}
          </p>
          <Button full onClick={onClose}>
            {t("checkin.dayLoggedCta")}
          </Button>
        </div>
      ) : null}

      {stage === "over" ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Mascot pose="error" size={180} />
          <h2 className="text-[24px] font-bold tracking-tight">{t("checkin.overBudgetTitle")}</h2>
          <p className="max-w-[280px] text-[14px] text-muted">{t("checkin.overBudgetBody")}</p>
          <Card tint className="flex w-full items-center justify-between px-4 py-3">
            <span className="text-[15px] font-medium">{t("today.tomorrowAllowance")}</span>
            <span className="rounded-full bg-gold px-3 py-1 text-[16px] font-bold text-gold-ink">
              <CountUp value={tomorrowAllowance} />
            </span>
          </Card>
          <Button full onClick={onClose}>
            {t("checkin.overBudgetCta")}
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}
