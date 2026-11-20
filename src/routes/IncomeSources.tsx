import { useMemo, useState } from "react";
import { NavBar } from "../components/NavBar";
import { Button, Capsule, Card, Group, Input, ListRow, SectionHeader } from "../components/ui";
import { Icon } from "../components/Icon";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { useI18n } from "../lib/i18n";
import { formatXaf } from "../lib/money";
import { api, useBootstrap, useRefresh } from "../lib/store";
import type { IncomeFrequency, IncomeSourceType } from "../lib/types";

type Draft = { name: string; type: IncomeSourceType; frequency: IncomeFrequency | null; paydayDay: string; typical: string };

const emptyDraft: Draft = { name: "", type: "side", frequency: null, paydayDay: "", typical: "" };

export function IncomeSourcesPage() {
  const { data } = useBootstrap();
  const { t, locale } = useI18n();
  const refresh = useRefresh();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const sources = useMemo(() => data?.incomeSources ?? [], [data]);
  const events = useMemo(() => [...(data?.incomeEvents ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [data]);

  const typeLabel = (type: IncomeSourceType) => t(`income.${type}`);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const source = sources.find((item) => item.id === id);
    if (!source) return;
    setEditing(id);
    setDraft({
      name: source.name,
      type: source.type,
      frequency: source.frequency,
      paydayDay: source.payday_day ? String(source.payday_day) : "",
      typical: String(source.typical_amount || ""),
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      name: draft.name.trim(),
      type: draft.type,
      frequency: draft.frequency,
      paydayDay: draft.paydayDay ? Number(draft.paydayDay) : null,
      typicalAmount: Number(draft.typical.replace(/\D/g, "") || "0"),
    };
    if (!payload.name) return;
    if (editing) await api.updateIncomeSource(editing, payload);
    else await api.createIncomeSource(payload);
    await refresh();
    setOpen(false);
    show(t("common.saved"));
  };

  const remove = async (id: string) => {
    await api.deleteIncomeSource(id);
    await refresh();
  };

  const dateLabel = (date: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
      new Date(`${date}T12:00:00Z`),
    );

  return (
    <div className="pb-6">
      <NavBar title={t("income.sources")} />
      <div className="mt-4 flex flex-col gap-4 px-5">
        <SectionHeader title={t("income.sources")} action={<button type="button" onClick={openNew} className="text-[14px] font-medium text-accent">{t("common.add")}</button>} />
        <Group>
          {sources.map((source) => (
            <ListRow
              key={source.id}
              icon={source.type === "salary" ? "wallet" : "arrowUp"}
              title={source.name}
              subtitle={`${typeLabel(source.type)} · ${formatXaf(source.typical_amount)} XAF`}
              trailing={
                <span className="flex items-center gap-1">
                  <button type="button" aria-label={t("common.edit")} onClick={() => openEdit(source.id)} className="grid h-9 w-9 place-items-center text-muted">
                    <Icon name="edit" size={17} />
                  </button>
                  {source.is_primary !== 1 ? (
                    <button type="button" aria-label={t("income.delete")} onClick={() => void remove(source.id)} className="grid h-9 w-9 place-items-center text-danger">
                      <Icon name="trash" size={17} />
                    </button>
                  ) : null}
                </span>
              }
            />
          ))}
        </Group>

        <SectionHeader title={t("income.title")} />
        <Card className="overflow-hidden">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="flex items-center gap-3 px-4 py-3 hairline-b last:border-b-0">
                <span className={`grid h-10 w-10 place-items-center rounded-[13px] ${event.status === "received" ? "bg-success-tint text-success" : "bg-gold/20 text-gold-ink"}`}>
                  <Icon name={event.status === "received" ? "check" : "clock"} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-medium">{sources.find((s) => s.id === event.source_id)?.name ?? t("income.source")}</p>
                  <p className="text-[13px] text-muted">
                    {event.status === "received" ? t("income.receivedOn", { date: dateLabel(event.date) }) : t("income.expectedOn", { date: dateLabel(event.date) })}
                  </p>
                </div>
                <span className="text-[16px] font-semibold tnum">{formatXaf(event.amount)}</span>
                <button type="button" aria-label={t("income.delete")} onClick={async () => { await api.deleteIncomeEvent(event.id); await refresh(); }} className="grid h-10 w-10 place-items-center text-muted">
                  <Icon name="close" size={18} />
                </button>
              </div>
            ))
          ) : (
            <p className="px-4 py-5 text-[14px] text-muted">{t("income.empty")}</p>
          )}
        </Card>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("income.sources") : t("income.sources")}
        footer={<Button full onClick={() => void save()} disabled={!draft.name.trim()}>{t("common.save")}</Button>}
      >
        <div className="flex flex-col gap-4 pb-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("income.sourceName")}</span>
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("income.sourceType")}</span>
            <div className="flex flex-wrap gap-2">
              {(["salary", "business", "freelance", "side", "gift", "other"] as IncomeSourceType[]).map((type) => (
                <Capsule key={type} type="button" selected={draft.type === type} onClick={() => setDraft({ ...draft, type })}>
                  {typeLabel(type)}
                </Capsule>
              ))}
            </div>
          </div>
          {draft.type === "salary" ? (
            <div className="flex flex-col gap-3">
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("income.frequency")}</span>
                <div className="flex gap-2">
                  {(["monthly", "weekly"] as IncomeFrequency[]).map((item) => (
                    <Capsule key={item} type="button" selected={draft.frequency === item} onClick={() => setDraft({ ...draft, frequency: item })}>
                      {item === "monthly" ? t("fixed.monthly") : t("fixed.weekly")}
                    </Capsule>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("income.payday")}</span>
                <Input inputMode="numeric" value={draft.paydayDay} onChange={(event) => setDraft({ ...draft, paydayDay: event.target.value })} placeholder="25" />
              </label>
            </div>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("income.typical")}</span>
            <Input inputMode="numeric" value={draft.typical} onChange={(event) => setDraft({ ...draft, typical: event.target.value })} placeholder="0" />
          </label>
          <p className="text-[12px] leading-snug text-muted">{t("income.comingUp")}</p>
        </div>
      </Sheet>
    </div>
  );
}
