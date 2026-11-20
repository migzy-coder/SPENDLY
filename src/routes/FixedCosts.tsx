import { useMemo, useState } from "react";
import { NavBar } from "../components/NavBar";
import { Button, Capsule, Card, Input, SectionHeader } from "../components/ui";
import { Icon } from "../components/Icon";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { useI18n } from "../lib/i18n";
import { CATEGORIES, formatXaf } from "../lib/money";
import { api, useBootstrap, useRefresh } from "../lib/store";
import type { Category, FixedCostFrequency } from "../lib/types";

type Draft = {
  name: string;
  amount: string;
  category: Category;
  frequency: FixedCostFrequency;
  dueDay: string;
  dueDate: string;
};

const emptyDraft: Draft = {
  name: "",
  amount: "",
  category: "Other",
  frequency: "monthly",
  dueDay: "",
  dueDate: "",
};

const frequencies: FixedCostFrequency[] = ["weekly", "monthly", "one_off"];
const frequencyLabel: Record<FixedCostFrequency, string> = {
  weekly: "fixed.weekly",
  monthly: "fixed.monthly",
  one_off: "fixed.oneOff",
};

export function FixedCostsPage() {
  const { data } = useBootstrap();
  const { t, locale } = useI18n();
  const refresh = useRefresh();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const costs = useMemo(() => data?.fixedCosts ?? [], [data]);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const cost = costs.find((item) => item.id === id);
    if (!cost) return;
    setEditing(id);
    setDraft({
      name: cost.name,
      amount: String(cost.amount),
      category: cost.category,
      frequency: cost.frequency,
      dueDay: cost.due_day ? String(cost.due_day) : "",
      dueDate: cost.due_date ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      name: draft.name.trim(),
      amount: Number(draft.amount.replace(/\D/g, "") || "0"),
      category: draft.category,
      frequency: draft.frequency,
      dueDay: draft.frequency === "monthly" && draft.dueDay ? Number(draft.dueDay) : null,
      dueDate: draft.frequency === "one_off" || draft.frequency === "weekly" ? draft.dueDate || null : null,
    };
    if (!payload.name || payload.amount <= 0) return;
    if (editing) await api.updateFixedCost(editing, payload);
    else await api.createFixedCost(payload);
    await refresh();
    setOpen(false);
    show(t("fixed.saved"));
  };

  const dueLabel = (frequency: FixedCostFrequency, dueDay: number | null, dueDate: string | null) => {
    if (frequency === "monthly") return `${t("fixed.dueDay")} ${dueDay ?? "—"}`;
    if (frequency === "one_off" && dueDate) {
      return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
        .format(new Date(`${dueDate}T12:00:00Z`));
    }
    if (frequency === "weekly" && dueDate) {
      return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "short", timeZone: "UTC" })
        .format(new Date(`${dueDate}T12:00:00Z`));
    }
    return "—";
  };

  return (
    <div className="pb-6">
      <NavBar title={t("fixed.title")} />
      <div className="mt-4 flex flex-col gap-4 px-5">
        <SectionHeader
          title={t("fixed.title")}
          action={<button type="button" onClick={openNew} className="text-[14px] font-medium text-accent">{t("common.add")}</button>}
        />
        {costs.length ? (
          <Card className="overflow-hidden">
            {costs.map((cost) => (
              <div key={cost.id} className="flex items-center gap-3 px-4 py-3 hairline-b last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-medium">{cost.name}</p>
                  <p className="text-[13px] text-muted">
                    {t(frequencyLabel[cost.frequency])} · {dueLabel(cost.frequency, cost.due_day, cost.due_date)}
                  </p>
                </div>
                <span className="text-[16px] font-semibold tnum">{formatXaf(cost.amount)}</span>
                <button type="button" aria-label={t("common.edit")} onClick={() => openEdit(cost.id)} className="grid h-10 w-10 place-items-center text-muted">
                  <Icon name="edit" size={18} />
                </button>
                <button
                  type="button"
                  aria-label={t("fixed.delete")}
                  onClick={async () => { await api.deleteFixedCost(cost.id); await refresh(); }}
                  className="grid h-10 w-10 place-items-center text-danger"
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="p-5 text-center">
            <p className="text-[14px] text-muted">{t("fixed.empty")}</p>
            <Button size="md" className="mt-3" onClick={openNew}>{t("fixed.add")}</Button>
          </Card>
        )}
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("fixed.edit") : t("fixed.add")}
        footer={<Button full onClick={() => void save()} disabled={!draft.name.trim() || !draft.amount}>{t("common.save")}</Button>}
      >
        <div className="flex flex-col gap-4 pb-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("fixed.name")}</span>
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("fixed.amount")}</span>
            <Input inputMode="numeric" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} placeholder="0" />
          </label>
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("fixed.category")}</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <Capsule key={category} type="button" selected={draft.category === category} onClick={() => setDraft({ ...draft, category })}>
                  {t(`categories.${category.toLowerCase()}`)}
                </Capsule>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("fixed.frequency")}</span>
            <div className="flex gap-2">
              {frequencies.map((item) => (
                <Capsule key={item} type="button" selected={draft.frequency === item} onClick={() => setDraft({ ...draft, frequency: item })}>
                  {t(frequencyLabel[item])}
                </Capsule>
              ))}
            </div>
          </div>
          {draft.frequency === "monthly" ? (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("fixed.dueDay")}</span>
              <Input inputMode="numeric" value={draft.dueDay} onChange={(event) => setDraft({ ...draft, dueDay: event.target.value })} placeholder="25" />
            </label>
          ) : null}
          {draft.frequency !== "monthly" ? (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("fixed.dueDate")}</span>
              <Input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} />
            </label>
          ) : null}
        </div>
      </Sheet>
    </div>
  );
}
