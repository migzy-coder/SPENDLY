import { useEffect, useMemo, useState } from "react";
import { AmountInput, Button, Capsule, Card, Input } from "./ui";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";
import { useI18n } from "../lib/i18n";
import { api, useBootstrap, useRefresh, useToday } from "../lib/store";

/** Variable money only counts once it is received. Expected income is shown, never counted. */
export function AddIncomeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useBootstrap();
  const today = useToday();
  const { t } = useI18n();
  const refresh = useRefresh();
  const { show } = useToast();
  const sources = useMemo(() => data?.incomeSources ?? [], [data]);
  const [sourceId, setSourceId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"received" | "expected">("received");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSourceId(sources.find((item) => !item.is_primary)?.id ?? sources[0]?.id ?? "");
      setAmount("");
      setDate(today);
      setNote("");
      setStatus("received");
    }
  }, [open, sources, today]);

  const sourceName = (id: string) => sources.find((item) => item.id === id)?.name ?? "";

  const submit = async () => {
    if (busy || !sourceId || !amount) return;
    setBusy(true);
    try {
      await api.createIncomeEvent({
        sourceId,
        amount: Number(amount.replace(/\D/g, "") || "0"),
        date,
        note: note.trim(),
        status,
      });
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
      title={t("income.add")}
      footer={
        <Button full disabled={busy || !sourceId || !amount} onClick={submit}>
          {busy ? t("common.saving") : t("income.save")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <Capsule type="button" selected={status === "received"} onClick={() => setStatus("received")} className="w-full text-center">
            {t("income.received")}
          </Capsule>
          <Capsule type="button" selected={status === "expected"} onClick={() => setStatus("expected")} className="w-full text-center">
            {t("income.expected")}
          </Capsule>
        </div>
        {status === "expected" ? (
          <p className="rounded-[14px] bg-gold/20 px-4 py-3 text-[13px] leading-snug text-gold-ink">
            {t("income.comingUp")}
          </p>
        ) : null}
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("income.source")}</span>
          <div className="flex flex-wrap gap-2">
            {sources.map((source) => (
              <Capsule key={source.id} type="button" selected={sourceId === source.id} onClick={() => setSourceId(source.id)}>
                {source.name}
              </Capsule>
            ))}
          </div>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("income.amount")}</span>
          <AmountInput value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("income.date")}</span>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("income.note")}</span>
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("income.notePlaceholder")} />
        </label>
        {sourceId ? (
          <Card className="px-4 py-3 text-[13px] text-muted">
            {sourceName(sourceId)} · {date}
          </Card>
        ) : null}
      </div>
    </Sheet>
  );
}
