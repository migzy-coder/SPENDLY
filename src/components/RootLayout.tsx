import { useEffect } from "react";
import { useLocation, Outlet } from "react-router";
import { useState } from "react";
import { AddSheet } from "./AddSheet";
import { InstallHint } from "./InstallHint";
import { TabBar } from "./TabBar";
import { useBootstrap } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { applyTheme, readTheme } from "../lib/theme";
import { useFeatures } from "../lib/features";

export function RootLayout() {
  const location = useLocation();
  const [addOpen, setAddOpen] = useState(false);
  const { data } = useBootstrap();
  const { locale, setLocale } = useI18n();
  const features = useFeatures();

  const tabRoutes = [
    ...(features.quickLog ? ["/today"] : []),
    ...(features.wishlist ? ["/goals"] : []),
    ...(features.stats ? ["/stats"] : []),
    ...(features.plan ? ["/plan"] : []),
  ];
  const showTabs = tabRoutes.includes(location.pathname);

  // The appearance and language stored with the account win over the local ones.
  useEffect(() => {
    const stored = data?.user?.theme;
    if (stored && stored !== readTheme()) applyTheme(stored);
    const userLocale = data?.user?.locale;
    if (userLocale && (userLocale === "fr" || userLocale === "en") && userLocale !== locale) {
      setLocale(userLocale);
    }
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
