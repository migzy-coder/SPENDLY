import { useEffect, useMemo, useState } from "react";
import { AmountInput, Button } from "./ui";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";
import { useI18n } from "../lib/i18n";
import { formatXaf } from "../lib/money";
import { buildPeriodState } from "../lib/selectors";
import { api, useBootstrap, useRefresh, useToday } from "../lib/store";
import type { Period } from "../lib/types";

/** Corrects the balance with an adjustment record — the past is never rewritten. */
export function UpdateBalanceSheet({
  open,
  onClose,
  period,
}: {
  open: boolean;
  onClose: () => void;
  period?: Period | null;
}) {
  const { data } = useBootstrap();
  const today = useToday();
  const { t } = useI18n();
  const refresh = useRefresh();
  const { show } = useToast();
  const state = useMemo(() => (data ? buildPeriodState(data, today) : null), [data, today]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setValue(String(state?.currentBalance ?? ""));
  }, [open, state?.currentBalance]);

  const current = state?.currentBalance ?? 0;
  const next = Number(value.replace(/\D/g, "") || "0");
  const difference = next - current;
  const targetPeriod = period ?? state?.period ?? null;

  const submit = async () => {
    if (busy || !value) return;
    setBusy(true);
    try {
      await api.updateBalance({ amount: difference, note: t("balance.title"), date: today });
      if (targetPeriod && !targetPeriod.balance_confirmed_at) await api.confirmBalance(targetPeriod.id);
      await refresh();
      show(t("common.saved"));
      onClose();
    } catch {
      show(t("common.somethingWrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("balance.title")}
      footer={
        <Button full disabled={busy || !value} onClick={submit}>
          {busy ? t("common.saving") : t("common.save")}
        </Button>
      }
    >
      <p className="pb-3 text-[14px] leading-snug text-muted">{t("balance.hint")}</p>
      <div className="mb-4 flex items-center justify-between rounded-[14px] bg-soft px-4 py-3">
        <span className="text-[14px] text-muted">{t("balance.current")}</span>
        <span className="text-[16px] font-bold tnum">{formatXaf(current)} XAF</span>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("balance.newBalance")}</span>
        <AmountInput value={value} onChange={(event) => setValue(event.target.value)} placeholder="0" autoFocus />
      </label>
      {value && difference !== 0 ? (
        <p className="mt-3 text-center text-[13px] font-semibold text-accent">
          {t("balance.difference", { amount: `${difference > 0 ? "+" : "−"} ${formatXaf(difference)}` })}
        </p>
      ) : null}
    </Sheet>
  );
}
