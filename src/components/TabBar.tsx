import { NavLink } from "react-router";
import { useI18n } from "../lib/i18n";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { useFeatures } from "../lib/features";

type Tab = { to: string; icon: IconName; labelKey: string };

export function TabBar({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n();
  const features = useFeatures();

  const tabs: Tab[] = [
    ...(features.quickLog ? [{ to: "/today", icon: "home" as IconName, labelKey: "nav.today" }] : []),
    ...(features.wishlist ? [{ to: "/goals", icon: "target" as IconName, labelKey: "nav.goals" }] : []),
    ...(features.stats ? [{ to: "/stats", icon: "stats" as IconName, labelKey: "nav.stats" }] : []),
    ...(features.plan ? [{ to: "/plan", icon: "plan" as IconName, labelKey: "nav.plan" }] : []),
  ];

  if (tabs.length === 0) return null;

  const showAdd = features.quickLog;

  return (
    <nav
      className="material hairline-t fixed inset-x-0 bottom-0 z-30 mx-auto flex h-[calc(66px+env(safe-area-inset-bottom,0px))] max-w-[480px] items-center gap-1 px-2 pb-[env(safe-area-inset-bottom,0px)]"
      aria-label={t("app.name")}
    >
      {tabs.map((tab) => (
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
      ))}
      {showAdd ? (
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label={t("nav.add")}
            className="-mt-7 grid h-[62px] w-[62px] place-items-center rounded-full bg-accent text-white shadow-[0_10px_24px_rgba(47,107,240,0.45)] ring-4 ring-bg transition-transform active:scale-95"
          >
            <Icon name="plus" size={28} strokeWidth={2.2} />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
