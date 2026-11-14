import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Mascot } from "../components/Mascot";
import { AmountInput, Button, Capsule, Card, Input, cn } from "../components/ui";
import { Icon } from "../components/Icon";
import { PageGuide } from "../components/PageGuide";
import { PaydayRangePicker } from "../components/PaydayRangePicker";
import { TimePicker } from "../components/TimePicker";
import { InstallPromptModal } from "../components/InstallPromptModal";
import { useI18n } from "../lib/i18n";
import { formatXaf, monthKey } from "../lib/money";
import { useAuth } from "../lib/auth-context";
import { api, useBootstrap, useRefresh, useToday } from "../lib/store";

export function SetupPage() {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const { data } = useBootstrap();
  const auth = useAuth();
  const refresh = useRefresh();
  const today = useToday();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // User info - prefill from Auth or Data so user is never asked twice
  const initialName = data?.user?.name || auth?.name || "";
  const [name, setName] = useState(initialName);

  // Budget states
  const [income, setIncome] = useState("");
  const [fixedCosts, setFixedCosts] = useState<{ name: string; amount: string }[]>([
    { name: "", amount: "" },
  ]);

  // Payday range (Cameroon flexible pay window)
  const [paydayStart, setPaydayStart] = useState(data?.user?.payday_day ?? 24);
  const [paydayEnd, setPaydayEnd] = useState(data?.user?.payday_day_end ?? 28);

  // Smart Goals & Savings
  const [hasGoal, setHasGoal] = useState(true);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalMonths, setGoalMonths] = useState(4);
  const [wishName, setWishName] = useState("");
  const [wishPrice, setWishPrice] = useState("");

  // Reminder
  const [nightlyTime, setNightlyTime] = useState(data?.user?.nightly_time ?? "21:00");

  const steps = useMemo(
    () => [
      { key: "language", title: t("setup.stepLanguage") },
      { key: "income", title: t("setup.stepIncome") },
      { key: "fixed", title: t("setup.stepFixed") },
      { key: "payday", title: t("setup.stepPayday") },
      { key: "savings", title: t("setup.stepSavings") },
      { key: "reminder", title: t("setup.stepReminder") },
      { key: "summary", title: t("setup.summary") },
    ],
    [t],
  );

  const numberOf = (value: string | number) => Number(String(value).replace(/\D/g, "") || "0");

  const incomeNum = numberOf(income);
  const totalFixed = fixedCosts.reduce((sum, cost) => sum + numberOf(cost.amount), 0);
  const goalTargetNum = hasGoal ? numberOf(goalTarget) : 0;
  const calculatedMonthlySavings =
    hasGoal && goalTargetNum > 0 ? Math.ceil(goalTargetNum / Math.max(1, goalMonths)) : 0;
  const leftToSpendEstimated = Math.max(0, incomeNum - totalFixed - calculatedMonthlySavings);

  const canContinue = () => {
    if (step === 1) return incomeNum > 0;
    return true;
  };

  const handleNext = () => {
    if (canContinue()) {
      if (step === steps.length - 1) {
        void finish();
      } else {
        setStep((s) => s + 1);
      }
    }
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const month = monthKey(today);
      const dueDate =
        hasGoal && goalName.trim() && goalTargetNum > 0
          ? new Date(Date.now() + goalMonths * 30 * 86400000).toISOString().slice(0, 10)
          : null;

      await api.setup({
        name: name.trim() || initialName || "Ami Spendly",
        paydayDay: paydayStart,
        paydayDayEnd: paydayEnd,
        nightlyTime,
        locale,
        income: incomeNum,
        savingsTarget: calculatedMonthlySavings,
        wishlistBudget: 0,
        month,
        fixedCosts: fixedCosts
          .filter((cost) => cost.name.trim() && numberOf(cost.amount) > 0)
          .map((cost) => ({ name: cost.name.trim(), amount: numberOf(cost.amount) })),
        goal:
          hasGoal && goalName.trim() && goalTargetNum > 0
            ? { name: goalName.trim(), target: goalTargetNum, dueDate }
            : null,
      });

      if (wishName.trim() && numberOf(wishPrice) > 0) {
        await api.createWish({
          name: wishName.trim(),
          price: numberOf(wishPrice),
          source: "Other",
          link: "",
          priority: "Want",
          unlockDate: null,
        });
      }

      await refresh();
      navigate("/plan", { replace: true });
    } catch (err) {
      console.error("Setup error", err);
      navigate("/plan", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-5 pt-safe pb-[max(env(safe-area-inset-bottom,0px),20px)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between py-4">
        <span className="text-[13px] font-bold text-muted">
          {step + 1} / {steps.length}
        </span>
        <button
          type="button"
          onClick={() => navigate("/plan")}
          className="text-[14px] font-semibold text-accent transition-transform active:scale-95"
        >
          {t("common.skip")}
        </button>
      </div>

      {/* Progress Line */}
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
          onSubmit={(e) => {
            e.preventDefault();
            handleNext();
          }}
          className="mt-6 flex flex-col gap-4 pb-6"
        >
          {/* STEP 0: LANGUAGE & NAME */}
          {step === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              <p className="text-center text-[14px] text-muted">{t("setup.intro")}</p>

              <Field label={t("settings.name")}>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={initialName || "Ton prénom"}
                  enterKeyHint="next"
                />
              </Field>

              <Field label={t("welcome.language")}>
                <div className="grid grid-cols-2 gap-2">
                  <Capsule
                    type="button"
                    selected={locale === "fr"}
                    onClick={() => setLocale("fr")}
                    className="w-full text-center"
                  >
                    Français 🇫🇷
                  </Capsule>
                  <Capsule
                    type="button"
                    selected={locale === "en"}
                    onClick={() => setLocale("en")}
                    className="w-full text-center"
                  >
                    English 🇬🇧
                  </Capsule>
                </div>
              </Field>
            </motion.div>
          ) : null}

          {/* STEP 1: INCOME */}
          {step === 1 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              <Field label={t("setup.stepIncome")} hint={t("setup.stepIncomeHint")}>
                <AmountInput
                  value={income}
                  onChange={(event) => setIncome(event.target.value)}
                  placeholder="0"
                  autoFocus
                  enterKeyHint="next"
                />
              </Field>
              {incomeNum > 0 ? (
                <div className="rounded-[16px] bg-accent-tint/60 p-3 text-center text-[13px] font-semibold text-accent">
                  {locale === "fr"
                    ? `Revenu noté : ${formatXaf(incomeNum)} XAF / mois`
                    : `Recorded income: ${formatXaf(incomeNum)} XAF / month`}
                </div>
              ) : null}
            </motion.div>
          ) : null}

          {/* STEP 2: FIXED COSTS */}
          {step === 2 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              <p className="text-[14px] text-muted">{t("setup.stepFixedHint")}</p>
              {fixedCosts.map((cost, index) => (
                <Card key={index} className="flex flex-col gap-2.5 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-muted">
                      {locale === "fr" ? `Charge ${index + 1}` : `Expense ${index + 1}`}
                    </span>
                    {fixedCosts.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setFixedCosts((list) => list.filter((_, i) => i !== index))
                        }
                        className="text-[12px] font-medium text-coral hover:underline"
                      >
                        {t("common.remove")}
                      </button>
                    ) : null}
                  </div>
                  <Input
                    value={cost.name}
                    placeholder={
                      locale === "fr"
                        ? "Ex: Loyer, Transport, Électricité, Spotify..."
                        : "E.g.: Rent, Commute, Electricity, Spotify..."
                    }
                    aria-label={t("setup.fixedCostName")}
                    enterKeyHint="next"
                    onChange={(event) =>
                      setFixedCosts((list) =>
                        list.map((item, position) =>
                          position === index ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <AmountInput
                    value={cost.amount}
                    placeholder="0"
                    aria-label={t("setup.fixedCostAmount")}
                    enterKeyHint="next"
                    onChange={(event) =>
                      setFixedCosts((list) =>
                        list.map((item, position) =>
                          position === index ? { ...item, amount: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setFixedCosts((list) => [...list, { name: "", amount: "" }])}
              >
                + {t("setup.addFixedCost")}
              </Button>

              {totalFixed > 0 ? (
                <div className="mt-1 flex items-center justify-between rounded-[14px] bg-soft px-3.5 py-2.5 text-[14px]">
                  <span className="text-muted">
                    {locale === "fr" ? "Total des charges fixes :" : "Total fixed expenses:"}
                  </span>
                  <span className="font-bold text-ink">{formatXaf(totalFixed)} XAF</span>
                </div>
              ) : null}
            </motion.div>
          ) : null}

          {/* STEP 3: PAYDAY RANGE */}
          {step === 3 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="mb-3 text-[14px] text-muted">{t("setup.stepPaydayHint")}</p>
              <PaydayRangePicker
                startDay={paydayStart}
                endDay={paydayEnd}
                onChange={(start, end) => {
                  setPaydayStart(start);
                  setPaydayEnd(end);
                }}
              />
            </motion.div>
          ) : null}

          {/* STEP 4: INTELLIGENT GOALS & SAVINGS */}
          {step === 4 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              <p className="text-[14px] text-muted leading-relaxed">
                {t("setup.stepSavingsHint")}
              </p>

              {/* Goal Toggle */}
              <div className="flex gap-2">
                <Capsule
                  type="button"
                  selected={hasGoal}
                  onClick={() => setHasGoal(true)}
                  className="flex-1 text-center"
                >
                  {locale === "fr" ? "J'ai un projet / achat" : "I have a project / goal"}
                </Capsule>
                <Capsule
                  type="button"
                  selected={!hasGoal}
                  onClick={() => setHasGoal(false)}
                  className="flex-1 text-center"
                >
                  {locale === "fr" ? "Pas pour l'instant" : "Not right now"}
                </Capsule>
              </div>

              {hasGoal ? (
                <Card className="flex flex-col gap-3.5 p-4 border border-accent/15">
                  <Field label={t("setup.goalQuestion")}>
                    <Input
                      value={goalName}
                      onChange={(event) => setGoalName(event.target.value)}
                      placeholder={t("setup.goalQuestionPlaceholder")}
                      enterKeyHint="next"
                    />
                  </Field>

                  <Field label={t("setup.goalTargetLabel")}>
                    <AmountInput
                      value={goalTarget}
                      onChange={(event) => setGoalTarget(event.target.value)}
                      placeholder="100 000"
                      enterKeyHint="next"
                    />
                  </Field>

                  <Field label={t("setup.goalMonthsLabel")}>
                    <div className="grid grid-cols-6 gap-1.5">
                      {[1, 2, 3, 4, 6, 12].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setGoalMonths(m)}
                          className={cn(
                            "flex h-10 flex-col items-center justify-center rounded-[12px] text-[13px] font-bold transition-all active:scale-95",
                            goalMonths === m
                              ? "bg-accent text-white shadow-sm"
                              : "bg-soft text-ink hover:bg-hairline",
                          )}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </Field>

                  {/* Real-time intelligent savings projection */}
                  {goalTargetNum > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-[16px] bg-accent-tint p-3.5 text-left"
                    >
                      <div className="flex items-center gap-2 text-accent font-bold text-[13px]">
                        <Icon name="spark" size={16} />
                        {t("setup.goalPlanSummary")}
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink font-medium">
                        {locale === "fr" ? (
                          <>
                            Pour financer ton projet de{" "}
                            <strong>{formatXaf(goalTargetNum)} XAF</strong> en{" "}
                            <strong>{goalMonths} mois</strong> :
                            <br />
                            👉 Tu épargneras{" "}
                            <span className="font-extrabold text-accent">
                              {formatXaf(calculatedMonthlySavings)} XAF / mois
                            </span>{" "}
                            (environ {formatXaf(Math.ceil(calculatedMonthlySavings / 30))} XAF /
                            jour).
                          </>
                        ) : (
                          <>
                            To reach your goal of{" "}
                            <strong>{formatXaf(goalTargetNum)} XAF</strong> in{" "}
                            <strong>{goalMonths} months</strong>:
                            <br />
                            👉 You'll save{" "}
                            <span className="font-extrabold text-accent">
                              {formatXaf(calculatedMonthlySavings)} XAF / month
                            </span>{" "}
                            (about {formatXaf(Math.ceil(calculatedMonthlySavings / 30))} XAF / day).
                          </>
                        )}
                      </p>
                    </motion.div>
                  ) : null}
                </Card>
              ) : null}

              {/* Wish (Optional) */}
              <div className="mt-2">
                <Field
                  label={t("setup.wishQuestion")}
                  hint={
                    locale === "fr"
                      ? "Un plaisir ou un cadeau à débloquer quand tu auras bien géré."
                      : "A treat or gift to unlock when you're on track."
                  }
                >
                  <div className="flex flex-col gap-2">
                    <Input
                      value={wishName}
                      onChange={(event) => setWishName(event.target.value)}
                      placeholder={t("setup.wishQuestionPlaceholder")}
                      enterKeyHint="next"
                    />
                    <AmountInput
                      value={wishPrice}
                      onChange={(event) => setWishPrice(event.target.value)}
                      placeholder={t("setup.wishPriceLabel")}
                      enterKeyHint="next"
                    />
                  </div>
                </Field>
              </div>
            </motion.div>
          ) : null}

          {/* STEP 5: CUSTOM TIME PICKER & NOTIFICATIONS */}
          {step === 5 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="mb-2 text-[14px] text-muted">{t("setup.stepReminderHint")}</p>
              <TimePicker value={nightlyTime} onChange={setNightlyTime} />
            </motion.div>
          ) : null}

          {/* STEP 6: SUMMARY */}
          {step === steps.length - 1 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              <Card className="flex flex-col gap-3.5 p-4 shadow-card">
                <SummaryRow label={t("setup.summaryIncome")} value={`${formatXaf(incomeNum)} XAF`} />
                <SummaryRow
                  label={t("setup.summaryFixed")}
                  value={`- ${formatXaf(totalFixed)} XAF`}
                />
                {calculatedMonthlySavings > 0 ? (
                  <SummaryRow
                    label={`${t("setup.summarySavings")} (${goalMonths}m)`}
                    value={`- ${formatXaf(calculatedMonthlySavings)} XAF`}
                  />
                ) : null}
                <hr className="border-hairline" />
                <div className="flex items-center justify-between rounded-[14px] bg-accent-tint/60 p-3">
                  <span className="text-[14px] font-bold text-accent">
                    {t("setup.summaryLeft")}
                  </span>
                  <span className="text-[20px] font-extrabold text-accent">
                    {formatXaf(leftToSpendEstimated)} XAF
                  </span>
                </div>
              </Card>

              <Card className="flex flex-col gap-2.5 p-3.5">
                <SummaryRow
                  label={t("setup.summaryPayday")}
                  value={
                    paydayStart === paydayEnd
                      ? `${paydayStart}`
                      : `${paydayStart} – ${paydayEnd}`
                  }
                />
                <SummaryRow label={t("setup.summaryReminder")} value={nightlyTime} />
              </Card>
            </motion.div>
          ) : null}

          {/* Hidden button for form submit on Enter key */}
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto flex gap-2 pt-2">
        {step > 0 ? (
          <Button
            type="button"
            variant="tinted"
            size="md"
            onClick={() => setStep((value) => value - 1)}
          >
            {t("common.back")}
          </Button>
        ) : null}
        <div className="flex-1">
          {step === steps.length - 1 ? (
            <Button full disabled={busy} onClick={finish}>
              {busy ? t("common.saving") : t("setup.finish")}
            </Button>
          ) : (
            <Button full disabled={!canContinue()} onClick={handleNext}>
              {t("common.next")}
            </Button>
          )}
        </div>
      </div>

      <p className="mt-2 flex items-center justify-center gap-1 text-center text-[12px] text-muted">
        <Icon name="lock" size={13} />
        {t("settings.storageNote")}
      </p>

      {/* PWA Install Sheet */}
      <InstallPromptModal
        open={showInstallModal}
        onClose={() => {
          setShowInstallModal(false);
          navigate("/plan", { replace: true });
        }}
      />
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block px-1 text-[13px] text-muted">{hint}</span> : null}
    </label>
  );
}
