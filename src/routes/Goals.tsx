import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Icon } from "../components/Icon";
import { Mascot } from "../components/Mascot";
import { NavBar } from "../components/NavBar";
import { AmountInput, Button, Card, Capsule, CountUp, EmptyState, Input, ProgressBar, Ring, SectionHeader, Tag } from "../components/ui";
import { useToast } from "../components/Toast";
import { useI18n } from "../lib/i18n";
import { formatXaf, safeToBuy } from "../lib/money";
import { buildMonthState } from "../lib/selectors";
import { api, useBootstrap, useRefresh, useToday } from "../lib/store";

const SOURCES = ["Jumia", "Instagram", "Shein", "Other"];
const PRIORITIES = ["Need", "Want", "Treat"] as const;

function nextPayday(payday: number, today: string): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const day = Math.min(payday, 28);
  let candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (candidate <= today) {
    const next = new Date(Date.UTC(year, month, 1));
    candidate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return candidate;
}

export function Goals() {
  const { data } = useBootstrap();
  const today = useToday();
  const { t, locale } = useI18n();
  const refresh = useRefresh();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  const state = useMemo(() => (data ? buildMonthState(data, today) : null), [data, today]);
  const goals = useMemo(() => data?.goals ?? [], [data]);
  const wishes = useMemo(() => data?.wishes.filter((wish) => wish.status !== "removed") ?? [], [data]);

  const totalSaved = useMemo(
    () =>
      goals.reduce(
        (sum, goal) =>
          sum +
          (data?.contributions ?? [])
            .filter((item) => item.goal_id === goal.id)
            .reduce((inner, item) => inner + item.amount, 0),
        0,
      ),
    [goals, data],
  );

  if (!data || !state) {
    return <div className="px-5 pt-16"><div className="h-12 w-40 animate-pulse rounded-[12px] bg-soft" /></div>;
  }

  const payday = nextPayday(data.user?.payday_day ?? 25, today);
  const paydayLabel = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${payday}T12:00:00Z`));

  const setAside = async (goalId: string, amount: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.contributeGoal(goalId, amount, today);
      await refresh();
      show(t("goals.setAsideDone", { amount: formatXaf(amount) }));
    } finally {
      setBusy(false);
    }
  };

  const markBought = async (wishId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.buyWish(wishId, today);
      await refresh();
      show(t("goals.bought"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-6">
      <header className="pt-safe px-5 pt-12">
        <p className="text-[12px] font-semibold tracking-[0.14em] text-muted">{t("goals.setAside")}</p>
        <p className="text-[52px] leading-none font-bold tracking-[-0.03em]">
          <CountUp value={totalSaved} />
          <span className="ml-1.5 text-[16px] font-semibold text-muted">XAF</span>
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-4 px-5">
        <Card className="flex items-center gap-3 p-4">
          <Mascot pose="categories" size={84} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold">{t("goals.smallSteps")}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">{t("goals.smallStepsBody")}</p>
          </div>
        </Card>

        <SectionHeader
          title={t("goals.myGoals")}
          action={
            <Link to="/goals/new" className="text-[14px] font-medium text-accent">
              {t("goals.addGoal")}
            </Link>
          }
        />

        {goals.length ? (
          <div className="flex flex-col gap-3">
            {goals.map((goal) => {
              const saved = (data.contributions ?? [])
                .filter((item) => item.goal_id === goal.id)
                .reduce((sum, item) => sum + item.amount, 0);
              const percent = goal.target ? Math.round((saved / goal.target) * 100) : 0;
              const remaining = Math.max(0, goal.target - saved);
              const daysUntil = goal.due_date
                ? Math.max(
                    1,
                    Math.round(
                      (new Date(`${goal.due_date}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) /
                        86_400_000,
                    ),
                  )
                : 0;
              return (
                <Link key={goal.id} to={`/goals/${goal.id}`} className="block">
                  <Card className="flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <Ring percent={percent} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[16px] font-bold">{goal.name}</p>
                          {goal.due_date ? (
                            <Tag tone="gold">
                              {t("goals.dueDate")} {Number(goal.due_date.slice(8, 10))}
                            </Tag>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[13px] text-muted">
                          {formatXaf(saved)} {t("common.of")} {formatXaf(goal.target)} XAF
                        </p>
                        <p className="text-[13px] text-muted">
                          {formatXaf(remaining)} {t("common.toGo")}
                          {goal.due_date
                            ? ` · ${t("goals.aboutPerDay", { amount: formatXaf(Math.ceil(remaining / daysUntil)) })}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[5000, 10000, 20000].map((value) => (
                        <button
                          key={value}
                          type="button"
                          disabled={busy}
                          onClick={(event) => {
                            event.preventDefault();
                            void setAside(goal.id, value);
                          }}
                          className="h-11 flex-1 rounded-full bg-soft text-[15px] font-medium active:scale-95 disabled:opacity-50"
                        >
                          +{value / 1000}k
                        </button>
                      ))}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <EmptyState
              image={<Mascot pose="empty" size={140} />}
              title={t("goals.noGoals")}
              body={t("goals.noGoalsBody")}
              action={
                <Link to="/goals/new">
                  <Button size="md">{t("goals.addGoal")}</Button>
                </Link>
              }
            />
          </Card>
        )}

        <SectionHeader
          title={t("goals.wishlist")}
          action={
            <Link to="/wishes/new" className="text-[14px] font-medium text-accent">
              {t("goals.addWish")}
            </Link>
          }
        />

        {wishes.length ? (
          <div className="grid grid-cols-2 gap-3">
            {wishes.map((wish) => {
              const safe = safeToBuy(wish.price, state.free);
              return (
                <Link key={wish.id} to={`/wishes/${wish.id}`} className="block">
                  <Card className="flex h-full flex-col p-3">
                    <span className="grid h-20 w-full place-items-center rounded-[14px] bg-accent-tint text-[28px] font-bold text-accent">
                      {wish.name.slice(0, 1).toUpperCase()}
                    </span>
                    <p className="mt-2 truncate text-[15px] font-bold">{wish.name}</p>
                    <span className="text-[12px] text-muted">{wish.source}</span>
                    <p className="mt-1 text-[17px] font-bold tnum">
                      {formatXaf(wish.price)} <span className="text-[12px] font-medium text-muted">XAF</span>
                    </p>
                    <span className="mt-1.5">
                      <Tag tone={safe ? "success" : "gold"}>
                        {safe ? t("goals.safeToBuy") : t("goals.afterPayday", { date: paydayLabel })}
                      </Tag>
                    </span>
                    {safe ? (
                      <Button
                        size="md"
                        className="mt-2 w-full"
                        disabled={busy}
                        onClick={(event) => {
                          event.preventDefault();
                          void markBought(wish.id);
                        }}
                      >
                        {t("goals.markBought")}
                      </Button>
                    ) : null}
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <EmptyState
              image={<Mascot pose="empty" size={140} />}
              title={t("goals.noWishes")}
              body={t("goals.noWishesBody")}
              action={
                <Link to="/wishes/new">
                  <Button size="md">{t("goals.addWish")}</Button>
                </Link>
              }
            />
          </Card>
        )}
      </div>
    </div>
  );
}

export function GoalNew() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const refresh = useRefresh();
  const { show } = useToast();
  const today = useToday();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [dueDate, setDueDate] = useState("");

  return (
    <div>
      <NavBar title={t("goals.newGoal")} />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("goals.goalName")}</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("setup.goalNamePlaceholder")} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("goals.target")}</span>
          <AmountInput value={target} onChange={(event) => setTarget(event.target.value)} placeholder="0" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("goals.dueDate")}</span>
          <Input type="date" value={dueDate} min={today} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <Button
          full
          disabled={!name.trim() || !Number(target.replace(/\D/g, ""))}
          onClick={async () => {
            await api.createGoal({
              name: name.trim(),
              target: Number(target.replace(/\D/g, "")),
              dueDate: dueDate || null,
            });
            await refresh();
            show(t("common.saved"));
            navigate("/goals");
          }}
        >
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

export function GoalDetail() {
  const { id } = useParams();
  const { data } = useBootstrap();
  const today = useToday();
  const { t } = useI18n();
  const navigate = useNavigate();
  const refresh = useRefresh();
  const { show } = useToast();
  const [amount, setAmount] = useState("");

  const goal = useMemo(() => data?.goals.find((item) => item.id === id), [data, id]);
  const contributions = useMemo(
    () => (data?.contributions ?? []).filter((item) => item.goal_id === id),
    [data, id],
  );

  if (!data || !goal) {
    return (
      <div>
        <NavBar title={t("goals.myGoals")} />
      </div>
    );
  }

  const saved = contributions.reduce((sum, item) => sum + item.amount, 0);
  const percent = goal.target ? Math.round((saved / goal.target) * 100) : 0;

  return (
    <div className="pb-6">
      <NavBar title={goal.name} />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <Card className="flex items-center gap-4 p-4">
          <Ring percent={percent} size={84} thickness={8} />
          <div className="min-w-0 flex-1">
            <p className="text-[22px] font-bold tnum">
              {formatXaf(saved)} <span className="text-[14px] font-medium text-muted">/ {formatXaf(goal.target)}</span>
            </p>
            <p className="text-[13px] text-muted">
              {formatXaf(Math.max(0, goal.target - saved))} {t("common.toGo")}
            </p>
            {goal.due_date ? (
              <p className="mt-1 text-[13px] text-muted">
                {t("goals.dueDate")} {goal.due_date.slice(0, 10)}
              </p>
            ) : null}
          </div>
        </Card>

        <SectionHeader title={t("goals.setAsideShort")} />
        <div className="flex flex-wrap gap-2">
          {[5000, 10000, 20000].map((value) => (
            <Capsule
              key={value}
              onClick={async () => {
                await api.contributeGoal(goal.id, value, today);
                await refresh();
                show(t("goals.setAsideDone", { amount: formatXaf(value) }));
              }}
            >
              {t("goals.setAsideShort")} +{value / 1000}k
            </Capsule>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <AmountInput
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={t("goals.custom")}
              aria-label={t("goals.custom")}
            />
          </div>
          <Button
            size="md"
            disabled={!Number(amount.replace(/\D/g, ""))}
            onClick={async () => {
              const value = Number(amount.replace(/\D/g, ""));
              await api.contributeGoal(goal.id, value, today);
              await refresh();
              setAmount("");
              show(t("goals.setAsideDone", { amount: formatXaf(value) }));
            }}
          >
            {t("common.add")}
          </Button>
        </div>

        <SectionHeader title={t("activity.title")} />
        <Card className="overflow-hidden">
          {contributions.length ? (
            contributions.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3 hairline-b last:border-b-0">
                <span className="text-[15px]">{item.date}</span>
                <span className="text-[15px] font-semibold tnum">{formatXaf(item.amount)}</span>
              </div>
            ))
          ) : (
            <p className="px-4 py-5 text-[14px] text-muted">{t("common.empty")}</p>
          )}
        </Card>

        <Button
          full
          variant="outline"
          onClick={async () => {
            await api.deleteGoal(goal.id);
            await refresh();
            navigate("/goals");
          }}
        >
          <Icon name="trash" size={18} />
          {t("common.delete")}
        </Button>
      </div>
    </div>
  );
}

export function WishNew() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const refresh = useRefresh();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [source, setSource] = useState(SOURCES[0]);
  const [link, setLink] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("Want");

  return (
    <div>
      <NavBar title={t("goals.newWish")} />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("goals.wishName")}</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("setup.wishNamePlaceholder")} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("goals.price")}</span>
          <AmountInput value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0" />
        </label>
        <div>
          <p className="mb-1.5 px-1 text-[13px] font-medium text-muted">{t("goals.source")}</p>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((item) => (
              <Capsule key={item} selected={source === item} onClick={() => setSource(item)}>
                {item}
              </Capsule>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 px-1 text-[13px] font-medium text-muted">{t("goals.priority")}</p>
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map((item) => (
              <Capsule key={item} selected={priority === item} onClick={() => setPriority(item)}>
                {t(`goals.${item.toLowerCase()}`)}
              </Capsule>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("goals.link")}</span>
          <Input value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://" />
        </label>
        <Button
          full
          disabled={!name.trim() || !Number(price.replace(/\D/g, ""))}
          onClick={async () => {
            await api.createWish({
              name: name.trim(),
              price: Number(price.replace(/\D/g, "")),
              source,
              link: link.trim(),
              priority,
              unlockDate: null,
            });
            await refresh();
            show(t("common.saved"));
            navigate("/goals");
          }}
        >
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

export function WishDetail() {
  const { id } = useParams();
  const { data } = useBootstrap();
  const today = useToday();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const refresh = useRefresh();
  const { show } = useToast();

  const wish = useMemo(() => data?.wishes.find((item) => item.id === id), [data, id]);
  const state = useMemo(() => (data ? buildMonthState(data, today) : null), [data, today]);

  if (!data || !wish || !state) {
    return <NavBar title={t("goals.wishlist")} />;
  }

  const safe = safeToBuy(wish.price, state.free);
  const payday = nextPayday(data.user?.payday_day ?? 25, today);
  const paydayLabel = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${payday}T12:00:00Z`));

  return (
    <div className="pb-6">
      <NavBar title={wish.name} />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <Card className="flex flex-col items-center gap-2 p-6 text-center">
          <Mascot pose={safe ? "success" : "motivational"} size={150} />
          <p className="text-[26px] font-bold tnum">
            {formatXaf(wish.price)} <span className="text-[14px] font-medium text-muted">XAF</span>
          </p>
          <Tag tone={safe ? "success" : "gold"}>
            {safe ? t("goals.safeToBuy") : t("goals.afterPayday", { date: paydayLabel })}
          </Tag>
          <p className="text-[13px] text-muted">
            {wish.source} · {t(`goals.${wish.priority.toLowerCase()}`)}
          </p>
        </Card>

        <Card className="px-4 py-3">
          <ProgressBar
            percent={state.free ? Math.min(100, (wish.price / (state.free * 0.4)) * 100) : 100}
            color={safe ? "var(--app-success)" : "var(--app-gold)"}
          />
          <p className="mt-2 text-[13px] text-muted">
            {t("plan.leftThisMonth")}: {formatXaf(state.free)} XAF
          </p>
        </Card>

        {safe ? (
          <Button
            full
            onClick={async () => {
              await api.buyWish(wish.id, today);
              await refresh();
              show(t("goals.bought"));
              navigate("/goals");
            }}
          >
            {t("goals.markBought")}
          </Button>
        ) : null}

        {wish.priority !== "Need" && wish.status !== "waiting" ? (
          <Button
            full
            variant="outline"
            onClick={async () => {
              const until = new Date();
              until.setHours(until.getHours() + 48);
              await api.waitWish(wish.id, until.toISOString());
              await refresh();
              show(t("goals.waiting", { date: until.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB") }));
            }}
          >
            {t("goals.wait48")}
          </Button>
        ) : null}

        {wish.status === "waiting" && wish.wait_until ? (
          <Card tint className="px-4 py-3 text-[14px]">
            {t("goals.waiting", { date: new Date(wish.wait_until).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB") })}
          </Card>
        ) : null}

        <Button
          full
          variant="outline"
          onClick={async () => {
            await api.deleteWish(wish.id);
            await refresh();
            navigate("/goals");
          }}
        >
          <Icon name="trash" size={18} />
          {t("common.delete")}
        </Button>
      </div>
    </div>
  );
}
