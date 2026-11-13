import { useNavigate } from "react-router";
import type { ReactNode } from "react";
import { useI18n } from "../lib/i18n";
import { Icon } from "./Icon";

/** Navigation bar for pushed pages: a back chevron, an optional title and actions. */
export function NavBar({
  title,
  subtitle,
  backLabel,
  right,
  onBack,
}: {
  title?: string;
  subtitle?: ReactNode;
  backLabel?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <header className="pt-safe px-4">
      <div className="flex h-11 items-center justify-between">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : navigate(-1))}
          className="-ml-1 flex h-11 items-center gap-0.5 pr-3 text-[17px] text-accent"
        >
          <Icon name="chevronLeft" size={19} strokeWidth={2.2} />
          {backLabel ?? t("common.back")}
        </button>
        {right ? <div className="flex items-center gap-1">{right}</div> : <span />}
      </div>
      {title ? (
        <div className="mt-1 mb-1">
          <h1 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-[14px] text-muted">{subtitle}</p> : null}
        </div>
      ) : null}
    </header>
  );
}
