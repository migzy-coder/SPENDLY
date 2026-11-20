import { useEffect, useRef } from "react";
import { useLocation, Outlet } from "react-router";
import { useState } from "react";
import { AddSheet } from "./AddSheet";
import { InstallHint } from "./InstallHint";
import { TabBar } from "./TabBar";
import { useBootstrap } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { applyTheme, readTheme } from "../lib/theme";

export function RootLayout() {
  const location = useLocation();
  const [addOpen, setAddOpen] = useState(false);
  const { data } = useBootstrap();
  const { locale, setLocale } = useI18n();

  const tabRoutes = ["/today", "/goals", "/stats", "/plan"];
  const showTabs = tabRoutes.includes(location.pathname);
  const appliedLocale = useRef<{ userId: string; locale: string } | null>(null);

  // The appearance and language stored with the account win over the local ones,
  // but only once per account/value: a choice made during onboarding or in
  // Settings must not be overwritten by the (still stale) cached profile.
  useEffect(() => {
    const stored = data?.user?.theme;
    if (stored && stored !== readTheme()) applyTheme(stored);
    const user = data?.user;
    if (!user?.onboarded || (user.locale !== "fr" && user.locale !== "en")) return;
    if (appliedLocale.current?.userId === user.id && appliedLocale.current.locale === user.locale) return;
    appliedLocale.current = { userId: user.id, locale: user.locale };
    if (user.locale !== locale) setLocale(user.locale);
  }, [data, locale, setLocale]);

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-bg">
      <main
        className={`app-scroll flex-1 ${
          showTabs ? "pb-[calc(76px+env(safe-area-inset-bottom,0px))]" : ""
        }`}
      >
        {showTabs ? <InstallHint /> : null}
        <Outlet />
      </main>
      {showTabs ? <TabBar onAdd={() => setAddOpen(true)} /> : null}
      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
