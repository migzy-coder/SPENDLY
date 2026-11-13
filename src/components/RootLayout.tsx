import { useEffect } from "react";
import { useLocation, Outlet } from "react-router";
import { useState } from "react";
import { AddSheet } from "./AddSheet";
import { InstallHint } from "./InstallHint";
import { TabBar } from "./TabBar";
import { useBootstrap } from "../lib/store";
import { applyTheme, readTheme } from "../lib/theme";

const TAB_ROUTES = ["/today", "/goals", "/stats", "/plan"];

export function RootLayout() {
  const location = useLocation();
  const [addOpen, setAddOpen] = useState(false);
  const { data } = useBootstrap();
  const showTabs = TAB_ROUTES.includes(location.pathname);

  // The appearance stored with the account wins over the local one.
  useEffect(() => {
    const stored = data?.user?.theme;
    if (stored && stored !== readTheme()) applyTheme(stored);
  }, [data]);

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
