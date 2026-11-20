import { useState } from "react";
import { AmountInput, Button } from "./ui";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";
import { useI18n } from "../lib/i18n";
import { api, useRefresh } from "../lib/store";

/** Confirming the salary closes the period and opens the next one with the balance carried over. */
export function SalarySheet({
  open,
  onClose,
  sourceId,
  date,
  suggested,
}: {
  open: boolean;
  onClose: () => void;
  sourceId: string;
  date: string;
  suggested: number;
}) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const { show } = useToast();
  const [amount, setAmount] = useState(suggested ? String(suggested) : "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const value = Number(amount.replace(/\D/g, "") || "0");
    if (busy || !sourceId || value <= 0) return;
    setBusy(true);
    try {
      await api.confirmSalary({ sourceId, amount: value, date });
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
      title={t("period.salaryTitle")}
      footer={<Button full disabled={busy || !amount} onClick={submit}>{busy ? t("common.saving") : t("common.confirm")}</Button>}
    >
      <p className="pb-3 text-[14px] leading-snug text-muted">{t("period.salaryBody")}</p>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("income.amount")}</span>
        <AmountInput value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
      </label>
    </Sheet>
  );
}
