import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Mascot } from "../components/Mascot";
import { AmountInput, Button, Capsule, Card, Input, cn } from "../components/ui";
import { Icon } from "../components/Icon";
import { PageGuide } from "../components/PageGuide";
import { PaydayRangePicker } from "../components/PaydayRangePicker";
import { useI18n } from "../lib/i18n";
import {
  DEFAULT_HORIZON,
  PERIOD_HORIZONS,
  addDays,
  dailyAllowance,
  daysBetween,
  formatXaf,
  periodEndFor,
  todayISO,
} from "../lib/money";
import type { IncomeMode } from "../lib/types";
import { useAuth } from "../lib/auth-context";
import { api, useBootstrap, useRefresh } from "../lib/store";

type BigPayment = { name: string; amount: string; date: string };

export function SetupPage() {
  const { t, locale, setLocale, formatDate } = useI18n();
  const navigate = useNavigate();
  const { data } = useBootstrap();
  const auth = useAuth();
  const refresh = useRefresh();
  const today = useMemo(() => todayISO(), []);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const initialName = data?.user?.name || auth?.name || "";
  const [mode, setMode] = useState<IncomeMode>("salary");
  const [balance, setBalance] = useState("");
  const [nextIncome, setNextIncome] = useState("");
  const [dontKnow, setDontKnow] = useState(true);
  const [horizon, setHorizon] = useState<number>(DEFAULT_HORIZON);
  const [paydayStart, setPaydayStart] = useState(data?.user?.payday_day ?? 24);
  const [paydayEnd, setPaydayEnd] = useState(data?.user?.payday_day_end ?? 28);
  const [bigPayments, setBigPayments] = useState<BigPayment[]>([]);

  const steps = useMemo(
    () => [
      { key: "earn", title: t("setup2.stepEarn") },
      { key: "balance", title: t("setup2.stepBalance") },
      { key: "income", title: t("setup2.stepIncome") },
      { key: "big", title: t("setup2.stepBig") },
      { key: "summary", title: t("setup2.summary") },
    ],
    [t],
  );

  const numberOf = (value: string | number) => Number(String(value).replace(/\D/g, "") || "0");
  const balanceNum = numberOf(balance);
  const bigTotal = bigPayments.reduce((sum, item) => sum + numberOf(item.amount), 0);

  const endDate = useMemo(() => {
    if (!dontKnow && nextIncome) return addDays(nextIncome, -1);
    if (mode === "variable") return periodEndFor(today, paydayStart, horizon);
    return periodEndFor(today, paydayStart, 0);
  }, [dontKnow, nextIncome, mode, today, paydayStart, horizon]);

  const days = Math.max(1, daysBetween(today, endDate) + 1);
  const estimatedAllowance = dailyAllowance(balanceNum - bigTotal, days);
  const canContinue = () => step !== 1 || balanceNum > 0;

  const advance = () => {
    if (!canContinue()) return;
    if (step === steps.length - 1) void finish();
    else setStep((value) => value + 1);
  };

  const skip = () => {
    if (step === 1) return;
    if (step === steps.length - 1) void finish();
    else setStep((value) => value + 1);
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.setup({
        name: initialName || "Ami Spendly",
        paydayDay: paydayStart,
        paydayDayEnd: paydayEnd,
        nightlyTime: data?.user?.nightly_time ?? "21:00",
        locale,
        incomeMode: mode,
        balance: balanceNum,
        nextIncomeDate: !dontKnow && nextIncome ? nextIncome : null,
        horizonDays: mode === "variable" ? horizon : DEFAULT_HORIZON,
        bigPayments: bigPayments
          .filter((item) => item.name.trim() && numberOf(item.amount) > 0 && item.date)
          .map((item) => ({ name: item.name.trim(), amount: numberOf(item.amount), date: item.date })),
        fixedCosts: [],
        goal: null,
      });
      await refresh();
      navigate("/today", { replace: true });
    } catch (error) {
      console.error("Setup error", error);
      navigate("/today", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-5 pt-safe pb-[max(env(safe-area-inset-bottom,0px),20px)]">
      <div className="flex items-center justify-between py-4">
        <span className="text-[13px] font-bold text-muted">
          {step + 1} / {steps.length}
        </span>
        {step !== 1 ? (
          <button
            type="button"
            onClick={skip}
            className="text-[14px] font-semibold text-accent transition-transform active:scale-95"
          >
            {t("common.skip")}
          </button>
        ) : (
          <span />
        )}
      </div>

      <div className="mb-4 flex gap-1.5" aria-hidden="true">
        {steps.map((item, index) => (
          <span
            key={item.key}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              index <= step ? "bg-accent" : "bg-hairline",
            )}
          />
        ))}
      </div>

      <div className="flex-1">
        <PageGuide
          id="setup"
          title={t("setup.guideTitle")}
          steps={[
            { title: t("setup.guideStep1Title"), body: t("setup.guideStep1Body") },
            { title: t("setup.guideStep2Title"), body: t("setup.guideStep2Body") },
            { title: t("setup.guideStep3Title"), body: t("setup.guideStep3Body") },
          ]}
        />

        <div className="flex justify-center py-2">
          <Mascot pose={step === steps.length - 1 ? "signup" : "home"} size={120} />
        </div>

        <h1 className="text-center text-[25px] leading-tight font-extrabold tracking-[-0.025em] text-ink">
          {steps[step].title}
        </h1>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            advance();
          }}
          className="mt-6 flex flex-col gap-4 pb-6"
        >
          {step === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              <p className="text-center text-[14px] text-muted">{t("setup2.earnHint")}</p>
              <div className="flex flex-col gap-2">
                {(
                  [
                    ["salary", "setup2.earnSalary"],
                    ["variable", "setup2.earnVariable"],
                    ["both", "setup2.earnBoth"],
                  ] as const
                ).map(([value, label]) => (
                  <Capsule
                    key={value}
                    type="button"
                    selected={mode === value}
                    onClick={() => setMode(value)}
                    className="w-full text-center"
                  >
                    {t(label)}
                  </Capsule>
                ))}
              </div>
              <Field label={t("welcome.language")}>
                <div className="grid grid-cols-2 gap-2">
                  <Capsule type="button" selected={locale === "fr"} onClick={() => setLocale("fr")} className="w-full text-center">
                    Français 🇫🇷
                  </Capsule>
                  <Capsule type="button" selected={locale === "en"} onClick={() => setLocale("en")} className="w-full text-center">
                    English 🇬🇧
                  </Capsule>
                </div>
              </Field>
            </motion.div>
          ) : null}

          {step === 1 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
              <p className="text-center text-[14px] leading-snug text-muted">{t("setup2.balanceHint")}</p>
              <Field label={t("setup2.balanceLabel")}>
                <AmountInput value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="0" autoFocus />
              </Field>
              {balanceNum > 0 ? (
                <p className="text-center text-[13px] font-semibold text-accent">
                  {t("setup2.balanceRecorded", { amount: formatXaf(balanceNum) })}
                </p>
              ) : null}
            </motion.div>
          ) : null}

          {step === 2 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              <p className="text-[14px] text-muted">{t("setup2.incomeHint")}</p>
              <div className="flex flex-col gap-2">
                <Capsule type="button" selected={dontKnow} onClick={() => setDontKnow(true)} className="w-full text-center">
                  {t("setup2.dontKnow")}
                </Capsule>
                <Capsule type="button" selected={!dontKnow} onClick={() => setDontKnow(false)} className="w-full text-center">
                  {t("setup2.knownDate")}
                </Capsule>
              </div>
              {!dontKnow ? (
                <Field label={t("setup2.nextIncomeLabel")}>
                  <Input type="date" value={nextIncome} onChange={(event) => setNextIncome(event.target.value)} />
                </Field>
              ) : (
                <>
                  <p className="text-[13px] text-muted">{t("setup2.horizonHint")}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PERIOD_HORIZONS.map((value) => (
                      <Capsule key={value} type="button" selected={horizon === value} onClick={() => setHorizon(value)} className="w-full text-center">
                        {t("setup2.days", { count: value })}
                      </Capsule>
                    ))}
                  </div>
                </>
              )}
              {mode !== "variable" ? (
                <div className="rounded-[16px] bg-soft p-3">
                  <PaydayRangePicker
                    startDay={paydayStart}
                    endDay={paydayEnd}
                    onChange={(start, end) => {
                      setPaydayStart(start);
                      setPaydayEnd(end);
                    }}
                  />
                  <p className="mt-2 text-[13px] leading-snug text-muted">{t("setup2.paydayHint")}</p>
                </div>
              ) : null}
            </motion.div>
          ) : null}

          {step === 3 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
              <p className="text-[14px] text-muted">{t("setup2.bigHint")}</p>
              {bigPayments.map((item, index) => (
                <Card key={index} className="flex flex-col gap-2.5 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-muted">{t("setup2.bigNumber", { number: index + 1 })}</span>
                    <button
                      type="button"
                      onClick={() => setBigPayments((list) => list.filter((_, position) => position !== index))}
                      className="text-[12px] font-medium text-coral hover:underline"
                    >
                      {t("common.remove")}
                    </button>
                  </div>
                  <Input
                    value={item.name}
                    placeholder={t("setup2.bigPlaceholder")}
                    onChange={(event) =>
                      setBigPayments((list) => list.map((row, position) => (position === index ? { ...row, name: event.target.value } : row)))
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <AmountInput
                      value={item.amount}
                      placeholder="0"
                      onChange={(event) =>
                        setBigPayments((list) => list.map((row, position) => (position === index ? { ...row, amount: event.target.value } : row)))
                      }
                    />
                    <Input
                      type="date"
                      value={item.date}
                      onChange={(event) =>
                        setBigPayments((list) => list.map((row, position) => (position === index ? { ...row, date: event.target.value } : row)))
                      }
                    />
                  </div>
                </Card>
              ))}
              <Button type="button" variant="outline" size="md" onClick={() => setBigPayments((list) => [...list, { name: "", amount: "", date: "" }])}>
                + {t("setup2.addBig")}
              </Button>
              {bigTotal > 0 ? (
                <p className="text-center text-[13px] text-muted">{t("setup2.bigTotal", { amount: formatXaf(bigTotal) })}</p>
              ) : null}
            </motion.div>
          ) : null}

          {step === 4 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
              <Card className="flex flex-col gap-3.5 p-4 shadow-card">
                <SummaryRow label={t("setup2.summaryBalance")} value={`${formatXaf(balanceNum)} XAF`} />
                <SummaryRow label={t("setup2.summaryCommitted")} value={`− ${formatXaf(bigTotal)} XAF`} />
                <SummaryRow label={t("setup2.summaryUntil")} value={formatDate(endDate, { day: "numeric", month: "short" })} />
                <hr className="border-hairline" />
                <div className="flex items-center justify-between rounded-[14px] bg-gold/20 p-3">
                  <span className="text-[14px] font-bold text-gold-ink">{t("setup2.summaryAllowance")}</span>
                  <span className="text-[20px] font-extrabold text-gold-ink">{formatXaf(estimatedAllowance)} XAF</span>
                </div>
              </Card>
              <button type="button" onClick={() => setStep(1)} className="self-center text-[14px] font-semibold text-accent">
                {t("setup2.updateBalance")}
              </button>
            </motion.div>
          ) : null}

          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </div>

      <div className="mt-auto flex gap-2 pt-2">
        {step > 0 ? (
          <Button type="button" variant="tinted" size="md" onClick={() => setStep((value) => value - 1)}>
            {t("common.back")}
          </Button>
        ) : null}
        <div className="flex-1">
          <Button full disabled={!canContinue() || busy} onClick={advance}>
            {busy
              ? t("common.saving")
              : step === steps.length - 1
                ? t("setup.finish")
                : t("common.next")}
          </Button>
        </div>
      </div>

      <p className="mt-2 flex items-center justify-center gap-1 text-center text-[12px] text-muted">
        <Icon name="lock" size={13} />
        {t("settings.storageNote")}
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] text-muted">{label}</span>
      <span className="text-[16px] font-semibold tnum text-ink">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
