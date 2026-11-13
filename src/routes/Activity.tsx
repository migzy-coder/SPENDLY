import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Icon } from "../components/Icon";
import { Mascot } from "../components/Mascot";
import { NavBar } from "../components/NavBar";
import { Sheet } from "../components/Sheet";
import { Button, Card, Capsule, EmptyState, Input } from "../components/ui";
import { useToast } from "../components/Toast";
import { useI18n } from "../lib/i18n";
import { CATEGORIES, formatXaf } from "../lib/money";
import type { Category, PaymentType } from "../lib/types";
import { api, useBootstrap, useRefresh, useToday } from "../lib/store";

const CATEGORY_COLORS: Record<Category, string> = {
  Food: "var(--cat-food)",
  Transport: "var(--cat-transport)",
  Airtime: "var(--cat-airtime)",
  Clothes: "var(--cat-clothes)",
  Social: "var(--cat-social)",
  Other: "var(--cat-other)",
};

const PAYMENTS: PaymentType[] = ["Cash", "Transfer", "Mobile Money"];

export function Activity() {
  const { data } = useBootstrap();
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<Category | "all">("all");

  const entries = useMemo(() => {
    const list = data?.entries ?? [];
    return filter === "all" ? list : list.filter((entry) => entry.category === filter);
  }, [data, filter]);

  const grouped = useMemo(() => {
    const groups: { date: string; items: typeof entries }[] = [];
    for (const entry of entries) {
      const last = groups[groups.length - 1];
      if (last && last.date === entry.date) last.items.push(entry);
      else groups.push({ date: entry.date, items: [entry] });
    }
    return groups;
  }, [entries]);

  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="pb-6">
      <NavBar title={t("activity.title")} subtitle={`${formatXaf(total)} XAF`} />
      <div className="px-5 pt-2">
        <div className="app-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          <Capsule selected={filter === "all"} onClick={() => setFilter("all")}>
            {t("activity.filterAll")}
          </Capsule>
          {CATEGORIES.map((category) => (
            <Capsule key={category} selected={filter === category} onClick={() => setFilter(category)}>
              {t(`categories.${category.toLowerCase()}`)}
            </Capsule>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-4 px-5">
        {grouped.length ? (
          grouped.map((group) => {
            const dayTotal = group.items.reduce((sum, entry) => sum + entry.amount, 0);
            return (
              <section key={group.date}>
                <div className="mb-1.5 flex items-baseline justify-between px-1">
                  <h2 className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">
                    {new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                    }).format(new Date(`${group.date}T12:00:00Z`))}
                  </h2>
                  <span className="text-[13px] font-semibold text-muted tnum">{formatXaf(dayTotal)}</span>
                </div>
                <Card className="overflow-hidden">
                  {group.items.map((entry) => (
                    <Link
                      key={entry.id}
                      to={`/activity/${entry.id}`}
                      className="flex items-center gap-3 px-4 py-3 hairline-b last:border-b-0"
                    >
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-[16px] font-bold"
                        style={{
                          background: CATEGORY_COLORS[entry.category],
                          color: entry.category === "Clothes" ? "var(--cat-ink-clothes)" : "#fff",
                        }}
                        aria-hidden="true"
                      >
                        {entry.category.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-medium">{t(`categories.${entry.category.toLowerCase()}`)}</p>
                        <p className="truncate text-[13px] text-muted">
                          {entry.note || t(`payment.${entry.payment_type.toLowerCase().replace(" ", "")}`)}
                        </p>
                      </div>
                      <span className="text-[16px] font-semibold tnum">{formatXaf(entry.amount)}</span>
                      <Icon name="chevronRight" size={17} className="text-muted" />
                    </Link>
                  ))}
                </Card>
              </section>
            );
          })
        ) : (
          <Card>
            <EmptyState
              image={<Mascot pose="empty" size={150} />}
              title={t("activity.empty")}
              body={t("today.noEntries")}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

export function EntryDetail() {
  const { id } = useParams();
  const { data } = useBootstrap();
  const today = useToday();
  const { t } = useI18n();
  const navigate = useNavigate();
  const refresh = useRefresh();
  const { show } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const entry = useMemo(() => data?.entries.find((item) => item.id === id), [data, id]);

  if (!entry) {
    return (
      <div>
        <NavBar title={t("activity.title")} />
      </div>
    );
  }

  return (
    <div className="pb-6">
      <NavBar
        title={t(`categories.${entry.category.toLowerCase()}`)}
        right={
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={t("common.edit")}
            className="grid h-11 w-11 place-items-center text-accent"
          >
            <Icon name="edit" size={21} />
          </button>
        }
      />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <Card className="flex flex-col items-center gap-2 p-6 text-center">
          <span
            className="grid h-16 w-16 place-items-center rounded-[20px] text-[24px] font-bold"
            style={{
              background: CATEGORY_COLORS[entry.category],
              color: entry.category === "Clothes" ? "var(--cat-ink-clothes)" : "#fff",
            }}
            aria-hidden="true"
          >
            {entry.category.slice(0, 1)}
          </span>
          <p className="text-[38px] leading-none font-bold tracking-[-0.03em] tnum">
            {formatXaf(entry.amount)}
          </p>
          <p className="text-[13px] text-muted">
            {entry.date} · {t(`payment.${entry.payment_type.toLowerCase().replace(" ", "")}`)}
          </p>
          {entry.note ? <p className="text-[15px]">{entry.note}</p> : null}
        </Card>

        <Button full variant="outline" onClick={() => setEditing(true)}>
          <Icon name="edit" size={18} />
          {t("activity.editEntry")}
        </Button>
        <Button full variant="tinted" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" size={18} />
          {t("activity.deleteEntry")}
        </Button>
      </div>

      <EditEntrySheet
        open={editing}
        onClose={() => setEditing(false)}
        entry={entry}
        onSave={async (next) => {
          await api.updateEntry(entry.id, next);
          await refresh();
          setEditing(false);
          show(t("common.saved"));
        }}
      />

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t("activity.deleteConfirm")}>
        <div className="flex flex-col gap-3 pb-2">
          <Button
            full
            onClick={async () => {
              await api.deleteEntry(entry.id);
              await refresh();
              setConfirmDelete(false);
              show(t("activity.deleted"));
              navigate("/activity");
            }}
          >
            {t("common.delete")}
          </Button>
          <Button full variant="plain" onClick={() => setConfirmDelete(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </Sheet>
      <input type="hidden" value={today} readOnly />
    </div>
  );
}

function EditEntrySheet({
  open,
  onClose,
  entry,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  entry: { date: string; category: Category; amount: number; payment_type: PaymentType; note: string };
  onSave: (next: {
    date: string;
    category: Category;
    amount: number;
    paymentType: PaymentType;
    note: string;
  }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [category, setCategory] = useState<Category>(entry.category);
  const [amount, setAmount] = useState(String(entry.amount));
  const [payment, setPayment] = useState<PaymentType>(entry.payment_type);
  const [note, setNote] = useState(entry.note);
  const [date, setDate] = useState(entry.date);

  return (
    <Sheet open={open} onClose={onClose} title={t("activity.editEntry")}>
      <div className="flex flex-col gap-4 pb-2">
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">{t("checkin.category")}</p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`h-[48px] rounded-[16px] bg-soft text-[14px] font-medium ${
                  category === item ? "border-2 border-accent bg-accent-tint font-bold" : ""
                }`}
              >
                {t(`categories.${item.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>
        <Input
          type="tel"
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label={t("checkin.amount")}
        />
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label={t("common.today")} />
        <div className="flex gap-2">
          {PAYMENTS.map((item) => (
            <Capsule key={item} selected={payment === item} onClick={() => setPayment(item)}>
              {t(`payment.${item.toLowerCase().replace(" ", "")}`)}
            </Capsule>
          ))}
        </div>
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("checkin.notePlaceholder")}
          aria-label={t("checkin.note")}
        />
        <Button
          full
          onClick={() =>
            onSave({
              date,
              category,
              amount: Number(amount.replace(/\D/g, "")),
              paymentType: payment,
              note: note.trim(),
            })
          }
        >
          {t("common.save")}
        </Button>
      </div>
    </Sheet>
  );
}
