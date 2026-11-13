import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Icon } from "../components/Icon";
import { Mascot } from "../components/Mascot";
import { NavBar } from "../components/NavBar";
import { Button, Card, Capsule, EmptyState, Input, ProgressBar } from "../components/ui";
import { useToast } from "../components/Toast";
import { useI18n } from "../lib/i18n";
import { debtSchedule, formatXaf } from "../lib/money";
import { api, useBootstrap, useRefresh, useToday } from "../lib/store";
import type { DebtDirection, DebtFrequency } from "../lib/types";

export function Debts() {
  const { data } = useBootstrap();
  const { t, locale } = useI18n();
  const refresh = useRefresh();
  const { show } = useToast();
  const debts = data?.debts ?? [];

  return (
    <div className="pb-6">
      <NavBar
        title={t("debts.title")}
        right={
          <Link to="/debts/new" aria-label={t("debts.addDebt")} className="grid h-11 w-11 place-items-center text-accent">
            <Icon name="plus" size={22} />
          </Link>
        }
      />
      <div className="flex flex-col gap-3 px-5 pt-2">
        {debts.length ? (
          debts.map((debt) => {
            const payments = (data?.payments ?? []).filter((payment) => payment.debt_id === debt.id);
            const paid = payments.filter((payment) => payment.paid_at).length;
            const next = payments.find((payment) => !payment.paid_at);
            const percent = debt.installments ? Math.round((paid / debt.installments) * 100) : 0;
            return (
              <Card key={debt.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[17px] font-bold">{debt.person}</p>
                  <span className="rounded-full bg-gold/20 px-2.5 py-1 text-[12px] font-semibold text-gold-ink">
                    {debt.direction === "owe" ? t("debts.iOwe") : t("debts.owedToMe")}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-muted">
                  {t("debts.progress", { paid, count: debt.installments })} ·{" "}
                  {t("debts.eachAmount", { amount: formatXaf(payments[0]?.amount ?? 0) })}
                </p>
                {next ? (
                  <p className="mt-1 text-[13px] text-muted">
                    {t("debts.nextDue", {
                      date: new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      }).format(new Date(`${next.due_date}T12:00:00Z`)),
                    })}
                  </p>
                ) : null}
                <ProgressBar className="mt-3" percent={percent} />
                {next ? (
                  <Button
                    size="md"
                    variant="outline"
                    className="mt-3"
                    onClick={async () => {
                      await api.payDebt(debt.id);
                      await refresh();
                      show(t("common.saved"));
                    }}
                  >
                    {t("debts.recordPayment")}
                  </Button>
                ) : (
                  <p className="mt-3 text-[13px] font-semibold text-success">{t("plan.allPaid")}</p>
                )}
              </Card>
            );
          })
        ) : (
          <Card>
            <EmptyState
              image={<Mascot pose="empty" size={150} />}
              title={t("debts.noDebts")}
              body={t("debts.noDebtsBody")}
              action={
                <Link to="/debts/new">
                  <Button size="md">{t("debts.addDebt")}</Button>
                </Link>
              }
            />
          </Card>
        )}
      </div>
    </div>
  );
}

export function DebtNew() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const refresh = useRefresh();
  const { show } = useToast();
  const today = useToday();

  const [person, setPerson] = useState("");
  const [direction, setDirection] = useState<DebtDirection>("owe");
  const [total, setTotal] = useState("");
  const [installments, setInstallments] = useState("3");
  const [frequency, setFrequency] = useState<DebtFrequency>("monthly");
  const [firstDueDate, setFirstDueDate] = useState(today);

  const preview = useMemo(() => {
    const value = Number(total.replace(/\D/g, "")) || 0;
    const count = Math.max(1, Number(installments.replace(/\D/g, "")) || 1);
    const schedule = debtSchedule({ total: value, installments: count, frequency, firstDueDate });
    return schedule[0]?.amount ?? 0;
  }, [total, installments, frequency, firstDueDate]);

  return (
    <div>
      <NavBar title={t("debts.newDebt")} />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("debts.person")}</span>
          <Input value={person} onChange={(event) => setPerson(event.target.value)} placeholder="Brice" />
        </label>
        <div>
          <p className="mb-1.5 px-1 text-[13px] font-medium text-muted">{t("debts.direction")}</p>
          <div className="flex gap-2">
            <Capsule selected={direction === "owe"} onClick={() => setDirection("owe")}>
              {t("debts.iOwe")}
            </Capsule>
            <Capsule selected={direction === "owed"} onClick={() => setDirection("owed")}>
              {t("debts.owedToMe")}
            </Capsule>
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("debts.total")}</span>
          <Input type="tel" inputMode="numeric" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="0" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("debts.installments")}</span>
          <Input
            type="tel"
            inputMode="numeric"
            value={installments}
            onChange={(event) => setInstallments(event.target.value)}
            placeholder="3"
          />
        </label>
        <div>
          <p className="mb-1.5 px-1 text-[13px] font-medium text-muted">{t("debts.frequency")}</p>
          <div className="flex gap-2">
            <Capsule selected={frequency === "monthly"} onClick={() => setFrequency("monthly")}>
              {t("debts.monthly")}
            </Capsule>
            <Capsule selected={frequency === "weekly"} onClick={() => setFrequency("weekly")}>
              {t("debts.weekly")}
            </Capsule>
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("debts.firstDue")}</span>
          <Input type="date" value={firstDueDate} min={today} onChange={(event) => setFirstDueDate(event.target.value)} />
        </label>
        <p className="text-[13px] text-muted">{t("debts.eachAmount", { amount: formatXaf(preview) })}</p>
        <Button
          full
          disabled={!person.trim() || !Number(total.replace(/\D/g, ""))}
          onClick={async () => {
            await api.createDebt({
              person: person.trim(),
              direction,
              total: Number(total.replace(/\D/g, "")),
              installments: Math.max(1, Number(installments.replace(/\D/g, "")) || 1),
              frequency,
              firstDueDate,
            });
            await refresh();
            show(t("common.saved"));
            navigate("/debts");
          }}
        >
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
