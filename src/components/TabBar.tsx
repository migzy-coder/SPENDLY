import { NavLink } from "react-router";
import { useI18n } from "../lib/i18n";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

const TABS: { to: string; icon: IconName; labelKey: string }[] = [
  { to: "/today", icon: "home", labelKey: "nav.today" },
  { to: "/goals", icon: "target", labelKey: "nav.goals" },
  { to: "/stats", icon: "stats", labelKey: "nav.stats" },
  { to: "/plan", icon: "plan", labelKey: "nav.plan" },
];

export function TabBar({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n();

  const renderTab = (tab: (typeof TABS)[number], index: number) => {
    if (index === 1) {
      return (
        <div key="add" className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label={t("nav.add")}
            className="-mt-7 grid h-[62px] w-[62px] place-items-center rounded-full bg-accent text-white shadow-[0_10px_24px_rgba(47,107,240,0.45)] ring-4 ring-bg transition-transform active:scale-95"
          >
            <Icon name="plus" size={28} strokeWidth={2.2} />
          </button>
        </div>
      );
    }
    return (
      <NavLink
        key={tab.to}
        to={tab.to}
        className={({ isActive }) =>
          `flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] py-1.5 text-[11px] font-medium transition-colors ${
            isActive ? "text-accent" : "text-muted"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`grid h-8 w-14 place-items-center rounded-[14px] transition-colors ${
                isActive ? "bg-accent-tint" : ""
              }`}
            >
              <Icon name={tab.icon} size={23} filled={false} strokeWidth={isActive ? 2.1 : 1.8} />
            </span>
            <span className={isActive ? "font-semibold" : ""}>{t(tab.labelKey)}</span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <nav
      className="material hairline-t fixed inset-x-0 bottom-0 z-30 mx-auto flex h-[calc(66px+env(safe-area-inset-bottom,0px))] max-w-[480px] items-center gap-1 px-2 pb-[env(safe-area-inset-bottom,0px)]"
      aria-label={t("app.name")}
    >
      {TABS.map(renderTab)}
    </nav>
  );
}
