import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Mascot } from "../components/Mascot";
import { Button, Capsule, Card, Input, cn } from "../components/ui";
import { Icon } from "../components/Icon";
import { PageGuide } from "../components/PageGuide";
import { useI18n } from "../lib/i18n";
import { formatXaf, monthKey } from "../lib/money";
import { api, useBootstrap, useRefresh, useToday } from "../lib/store";

const PAYDAY_OPTIONS = [25, 24, 27, 28, 5, 10, 15, 30];
const TIME_OPTIONS = ["18:00", "19:00", "20:00", "21:00", "22:00"];

export function SetupPage() {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const { data } = useBootstrap();
  const refresh = useRefresh();
  const today = useToday();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(data?.user?.name ?? "");
  const [income, setIncome] = useState("");
  const [fixedCosts, setFixedCosts] = useState<{ name: string; amount: string }[]>([{ name: "", amount: "" }]);
  const [payday, setPayday] = useState(data?.user?.payday_day ?? 25);
  const [savings, setSavings] = useState("");
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [wishName, setWishName] = useState("");
  const [wishPrice, setWishPrice] = useState("");
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

  const numberOf = (value: string) => Number(value.replace(/\D/g, "") || "0");

  const canContinue = () => {
    if (step === 1) return numberOf(income) > 0;
    if (step === 4) return numberOf(savings) >= 0;
    return true;
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const month = monthKey(today);
      await api.setup({
        name: name.trim(),
        paydayDay: payday,
        nightlyTime,
        locale,
        income: numberOf(income),
        savingsTarget: numberOf(savings),
        wishlistBudget: 0,
        month,
        fixedCosts: fixedCosts
          .filter((cost) => cost.name.trim() && numberOf(cost.amount) > 0)
          .map((cost) => ({ name: cost.name.trim(), amount: numberOf(cost.amount) })),
        goal:
          goalName.trim() && numberOf(goalTarget) > 0
            ? { name: goalName.trim(), target: numberOf(goalTarget), dueDate: null }
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-5 pt-safe pb-[max(env(safe-area-inset-bottom,0px),20px)]">
      <div className="flex items-center justify-between py-4">
        <span className="text-[13px] font-semibold text-muted">
          {step + 1} / {steps.length}
        </span>
        <button
          type="button"
          onClick={() => navigate("/plan")}
          className="text-[14px] font-medium text-accent"
        >
          {t("common.skip")}
        </button>
      </div>
      <div className="mb-4 flex gap-1.5" aria-hidden="true">
        {steps.map((item, index) => (
          <span
            key={item.key}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
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
          <Mascot pose={step === steps.length - 1 ? "signup" : "home"} size={130} />
        </div>
        <h1 className="text-center text-[26px] leading-tight font-bold tracking-[-0.025em]">
          {steps[step].title}
        </h1>

        <div className="mt-6 flex flex-col gap-4 pb-6">
          {step === 0 ? (
            <>
              <p className="text-center text-[14px] text-muted">{t("setup.intro")}</p>
              <Field label={t("settings.name")}>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("settings.name")} />
              </Field>
              <Field label={t("welcome.language")}>
                <div className="flex gap-2">
                  <Capsule selected={locale === "fr"} onClick={() => setLocale("fr")}>
                    Français
                  </Capsule>
                  <Capsule selected={locale === "en"} onClick={() => setLocale("en")}>
                    English
                  </Capsule>
                </div>
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <Field label={t("setup.stepIncome")} hint={t("setup.stepIncomeHint")}>
              <Input
                type="tel"
                inputMode="numeric"
                value={income}
                onChange={(event) => setIncome(event.target.value)}
                placeholder="0"
              />
            </Field>
          ) : null}

          {step === 2 ? (
            <>
              <p className="text-[14px] text-muted">{t("setup.stepFixedHint")}</p>
              {fixedCosts.map((cost, index) => (
                <Card key={index} className="flex flex-col gap-2 p-3">
                  <Input
                    value={cost.name}
                    placeholder={t("setup.fixedCostName")}
                    aria-label={t("setup.fixedCostName")}
                    onChange={(event) =>
                      setFixedCosts((list) =>
                        list.map((item, position) =>
                          position === index ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Input
                    type="tel"
                    inputMode="numeric"
                    value={cost.amount}
                    placeholder={t("setup.fixedCostAmount")}
                    aria-label={t("setup.fixedCostAmount")}
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
                variant="outline"
                onClick={() => setFixedCosts((list) => [...list, { name: "", amount: "" }])}
              >
                {t("setup.addFixedCost")}
              </Button>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <p className="text-[14px] text-muted">{t("setup.stepPaydayHint")}</p>
              <div className="flex flex-wrap gap-2">
                {PAYDAY_OPTIONS.map((day) => (
                  <Capsule key={day} selected={payday === day} onClick={() => setPayday(day)}>
                    {day}
                  </Capsule>
                ))}
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <Field label={t("goals.savedSoFar")} hint={t("setup.stepSavingsHint")}>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={savings}
                  onChange={(event) => setSavings(event.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label={t("setup.goalName")}>
                <Input
                  value={goalName}
                  onChange={(event) => setGoalName(event.target.value)}
                  placeholder={t("setup.goalNamePlaceholder")}
                />
              </Field>
              <Field label={t("setup.goalTarget")}>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={goalTarget}
                  onChange={(event) => setGoalTarget(event.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label={t("setup.wishName")}>
                <Input
                  value={wishName}
                  onChange={(event) => setWishName(event.target.value)}
                  placeholder={t("setup.wishNamePlaceholder")}
                />
              </Field>
              <Field label={t("setup.wishPrice")}>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={wishPrice}
                  onChange={(event) => setWishPrice(event.target.value)}
                  placeholder="0"
                />
              </Field>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <p className="text-[14px] text-muted">{t("setup.stepReminderHint")}</p>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map((time) => (
                  <Capsule key={time} selected={nightlyTime === time} onClick={() => setNightlyTime(time)}>
                    {time}
                  </Capsule>
                ))}
              </div>
            </>
          ) : null}

          {step === steps.length - 1 ? (
            <Card className="flex flex-col gap-3 p-4">
              <SummaryRow label={t("setup.stepIncome")} value={formatXaf(numberOf(income))} />
              <SummaryRow
                label={t("setup.stepFixed")}
                value={formatXaf(
                  fixedCosts.reduce((sum, cost) => sum + numberOf(cost.amount), 0),
                )}
              />
              <SummaryRow label={t("setup.stepPayday")} value={String(payday)} />
              <SummaryRow label={t("goals.savedSoFar")} value={formatXaf(numberOf(savings))} />
              <SummaryRow label={t("setup.stepReminder")} value={nightlyTime} />
            </Card>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex gap-2 pt-2">
        {step > 0 ? (
          <Button variant="tinted" size="md" onClick={() => setStep((value) => value - 1)}>
            {t("common.back")}
          </Button>
        ) : null}
        <div className="flex-1">
          {step === steps.length - 1 ? (
            <Button full disabled={busy} onClick={finish}>
              {t("setup.finish")}
            </Button>
          ) : (
            <Button full disabled={!canContinue()} onClick={() => setStep((value) => value + 1)}>
              {t("common.next")}
            </Button>
          )}
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
      <span className="text-[16px] font-semibold tnum">{value}</span>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block px-1 text-[13px] text-muted">{hint}</span> : null}
    </label>
  );
}
