import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Icon } from "../components/Icon";
import { Mascot } from "../components/Mascot";
import { NavBar } from "../components/NavBar";
import { Sheet } from "../components/Sheet";
import { Button, Capsule, Card, Group, Input, ListRow, SectionHeader, Segmented, Switch } from "../components/ui";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { applyTheme, readTheme } from "../lib/theme";
import type { ThemeMode } from "../lib/theme";
import { api, useBootstrap, useRefresh } from "../lib/store";
import type { ReminderItem } from "../lib/types";

export function Settings() {
  const { data } = useBootstrap();
  const { t, locale, setLocale } = useI18n();
  const { signOut, isDemo } = useAuth();
  const navigate = useNavigate();
  const { show } = useToast();
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const download = async (format: "json" | "csv") => {
    try {
      const text = await api.exportData(format);
      const blob = new Blob([text], { type: format === "csv" ? "text/csv" : "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `spendly-export.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      show(t("common.saved"));
    } catch {
      show(t("common.somethingWrong"));
    }
  };

  return (
    <div className="pb-6">
      <NavBar title={t("settings.title")} />

      <div className="flex flex-col gap-4 px-5 pt-2">
        <Card className="flex items-center gap-3 p-4">
          <Mascot pose="settings" size={80} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-bold">{data?.user?.name || "Spendly"}</p>
            <p className="truncate text-[13px] text-muted">{data?.user?.id}</p>
          </div>
        </Card>

        <Group>
          <ListRow
            icon="people"
            title={t("settings.profile")}
            onClick={() => navigate("/settings/profile")}
            trailing={<Icon name="chevronRight" size={17} className="text-muted" />}
          />
          <ListRow
            icon="bell"
            title={t("settings.notifications")}
            onClick={() => navigate("/settings/reminders")}
            trailing={<Icon name="chevronRight" size={17} className="text-muted" />}
          />
          <ListRow
            icon="help"
            title={t("settings.help")}
            onClick={() => navigate("/settings/help")}
            trailing={<Icon name="chevronRight" size={17} className="text-muted" />}
          />
        </Group>

        <SectionHeader title={t("settings.language")} />
        <Card className="p-4">
          <Segmented
            value={locale}
            onChange={(value) => {
              setLocale(value);
              if (data?.user) {
                void api.saveProfile({
                  name: data.user.name,
                  paydayDay: data.user.payday_day,
                  nightlyTime: data.user.nightly_time,
                  locale: value,
                  theme,
                });
              }
            }}
            options={[
              { value: "fr", label: "Français" },
              { value: "en", label: "English" },
            ]}
          />
        </Card>

        <SectionHeader title={t("settings.theme")} />
        <Card className="p-4">
          <Segmented
            value={theme}
            onChange={(value) => {
              setTheme(value);
              applyTheme(value);
              if (data?.user) {
                void api.saveProfile({
                  name: data.user.name,
                  paydayDay: data.user.payday_day,
                  nightlyTime: data.user.nightly_time,
                  locale,
                  theme: value,
                });
              }
            }}
            options={[
              { value: "light", label: t("settings.themeLight") },
              { value: "dark", label: t("settings.themeDark") },
              { value: "system", label: t("settings.themeSystem") },
            ]}
          />
        </Card>

        <Group>
          <ListRow icon="shield" title={t("settings.privacy")} onClick={() => navigate("/legal/privacy")} />
          <ListRow icon="receipt" title={t("settings.terms")} onClick={() => navigate("/legal/terms")} />
        </Group>

        <SectionHeader title={t("settings.export")} />
        <Card className="px-4 py-3">
          <p className="text-[13px] text-muted">{t("settings.exportHint")}</p>
          <div className="mt-3 flex gap-2">
            <Button size="md" variant="outline" className="flex-1" onClick={() => download("json")}>
              {t("settings.exportJson")}
            </Button>
            <Button size="md" variant="outline" className="flex-1" onClick={() => download("csv")}>
              {t("settings.exportCsv")}
            </Button>
          </div>
        </Card>

        {!isDemo ? (
          <Button full variant="tinted" onClick={() => setConfirmSignOut(true)}>
            <Icon name="logout" size={18} />
            {t("settings.signOut")}
          </Button>
        ) : null}

        <Button full variant="outline" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" size={18} />
          {t("settings.deleteAccount")}
        </Button>
        <p className="text-center text-[12px] text-muted">{t("settings.storageNote")}</p>
      </div>

      <Sheet open={confirmSignOut} onClose={() => setConfirmSignOut(false)} title={t("settings.signOutConfirmTitle")}>
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-[14px] text-muted">{t("settings.signOutConfirmBody")}</p>
          <Button
            full
            onClick={async () => {
              setConfirmSignOut(false);
              await signOut();
              navigate("/welcome");
            }}
          >
            {t("settings.signOutConfirmAction")}
          </Button>
          <Button full variant="plain" onClick={() => setConfirmSignOut(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t("settings.deleteConfirmTitle")}>
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-[14px] text-muted">{t("settings.deleteConfirmBody")}</p>
          <Button
            full
            onClick={async () => {
              await api.deleteAccount();
              setConfirmDelete(false);
              navigate("/welcome");
            }}
          >
            {t("settings.deleteConfirmAction")}
          </Button>
          <Button full variant="plain" onClick={() => setConfirmDelete(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

export function ProfileSettings() {
  const { data } = useBootstrap();
  const { t } = useI18n();
  const refresh = useRefresh();
  const { show } = useToast();
  const [name, setName] = useState(data?.user?.name ?? "");
  const [payday, setPayday] = useState(String(data?.user?.payday_day ?? 25));
  const [nightlyTime, setNightlyTime] = useState(data?.user?.nightly_time ?? "21:00");

  return (
    <div className="pb-6">
      <NavBar title={t("settings.profile")} />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("settings.name")}</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("settings.paydayDay")}</span>
          <Input type="tel" inputMode="numeric" value={payday} onChange={(event) => setPayday(event.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">{t("settings.nightlyTime")}</span>
          <Input type="time" value={nightlyTime} onChange={(event) => setNightlyTime(event.target.value)} />
        </label>
        <Card className="flex items-center justify-between px-4 py-3">
          <span className="text-[15px]">{t("settings.timezone")}</span>
          <span className="text-[14px] text-muted">{data?.user?.timezone ?? "Africa/Douala"}</span>
        </Card>
        <Button
          full
          onClick={async () => {
            await api.saveProfile({
              name: name.trim(),
              paydayDay: Math.max(1, Math.min(28, Number(payday.replace(/\D/g, "")) || 25)),
              nightlyTime: /^\d{2}:\d{2}$/.test(nightlyTime) ? nightlyTime : "21:00",
              locale: data?.user?.locale ?? "fr",
              theme: data?.user?.theme ?? "light",
            });
            await refresh();
            show(t("common.saved"));
          }}
        >
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

const REMINDER_KEYS: { key: ReminderItem["key"]; title: string; body: string; options: string[] }[] = [
  { key: "nightly", title: "reminders.nightly", body: "reminders.nightlyBody", options: ["18:00", "19:00", "20:00", "21:00", "22:00"] },
  { key: "planned", title: "reminders.planned", body: "reminders.plannedBody", options: ["08:00", "12:00", "18:00"] },
  { key: "payday", title: "reminders.payday", body: "reminders.paydayBody", options: ["08:00", "17:00"] },
  { key: "missed", title: "reminders.missed", body: "reminders.missedBody", options: ["08:00", "09:00"] },
  { key: "weekly", title: "reminders.weekly", body: "reminders.weeklyBody", options: ["07:00", "18:00"] },
];

export function Reminders() {
  const { data } = useBootstrap();
  const { t } = useI18n();
  const refresh = useRefresh();
  const { show } = useToast();

  const initial = useMemo<ReminderItem[]>(() => {
    const stored = data?.reminders ?? [];
    return REMINDER_KEYS.map((item) => {
      const row = stored.find((entry) => entry.key === item.key);
      return {
        key: item.key,
        enabled: row ? row.enabled === 1 : true,
        timeChoice: row?.time_choice ?? item.options[0],
      };
    });
  }, [data]);

  const [items, setItems] = useState<ReminderItem[]>(initial);

  const update = async (next: ReminderItem[]) => {
    setItems(next);
    await api.saveReminders(next);
    await refresh();
  };

  return (
    <div className="pb-6">
      <NavBar title={t("reminders.title")} />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <Card className="flex items-center gap-3 p-4">
          <Mascot pose="notifications" size={80} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold">{t("reminders.intro")}</p>
            <p className="mt-0.5 text-[13px] text-muted">{t("reminders.introBody")}</p>
          </div>
        </Card>

        {REMINDER_KEYS.map((item) => {
          const current = items.find((entry) => entry.key === item.key);
          if (!current) return null;
          return (
            <Card key={item.key} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-medium">{t(item.title)}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{t(item.body)}</p>
                </div>
                <Switch
                  checked={current.enabled}
                  label={t(item.title)}
                  onChange={(value) =>
                    update(items.map((entry) => (entry.key === item.key ? { ...entry, enabled: value } : entry)))
                  }
                />
              </div>
              {current.enabled && item.options.length > 1 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.options.map((option) => (
                    <Capsule
                      key={option}
                      selected={current.timeChoice === option}
                      onClick={() =>
                        update(
                          items.map((entry) =>
                            entry.key === item.key ? { ...entry, timeChoice: option } : entry,
                          ),
                        )
                      }
                    >
                      {option}
                    </Capsule>
                  ))}
                </div>
              ) : null}
            </Card>
          );
        })}

        <Card tint className="px-4 py-3 text-[13px] text-muted">{t("reminders.pushNote")}</Card>

        <Button variant="outline" full onClick={() => show(t("reminders.testSent"))}>
          {t("reminders.test")}
        </Button>
      </div>
    </div>
  );
}

export function Help() {
  const { t } = useI18n();
  const { isDemo } = useAuth();

  return (
    <div className="pb-6">
      <NavBar title={t("settings.help")} />
      <div className="flex flex-col gap-4 px-5 pt-2">
        <Card className="flex flex-col items-center gap-2 p-6 text-center">
          <Mascot pose="help" size={140} />
          <p className="text-[17px] font-bold">{t("settings.help")}</p>
          <p className="max-w-[260px] text-[14px] text-muted">{t("app.tagline")}</p>
        </Card>

        <SectionHeader title={t("settings.title")} />
        <Group>
          <ListRow icon="receipt" title={t("checkin.title")} subtitle={t("checkin.spentNothing")} />
          <ListRow icon="target" title={t("goals.title")} subtitle={t("goals.smallStepsBody")} />
          <ListRow icon="stats" title={t("stats.title")} subtitle={t("stats.needDays")} />
        </Group>

        <SectionHeader title="Contact" />
        <Group>
          <ListRow
            icon="bell"
            title="Email"
            subtitle={isDemo ? "support@miguelyango.com" : "support@miguelyango.com"}
          />
          <ListRow icon="people" title="WhatsApp" subtitle="+237 6 XX XX XX XX" />
        </Group>

        <p className="text-center text-[12px] text-muted">{t("legal.draftNote")}</p>
      </div>
    </div>
  );
}
