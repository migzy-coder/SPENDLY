import { useState } from "react";
import { Icon } from "./Icon";
import { Card } from "./ui";
import { useI18n } from "../lib/i18n";

type GuideStep = { title: string; body: string };

const SEEN_KEY = "spendly.guides.seen";

function hasSeen(id: string): boolean {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const seen = raw ? (JSON.parse(raw) as string[]) : [];
    return seen.includes(id);
  } catch {
    return false;
  }
}

function markSeen(id: string) {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const seen = raw ? (JSON.parse(raw) as string[]) : [];
    if (!seen.includes(id)) {
      seen.push(id);
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    }
  } catch {
    /* ignore */
  }
}

/** Per-page guidance: shows on first visit and can be reopened. */
export function PageGuide({ id, title, steps }: { id: string; title: string; steps: GuideStep[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(() => !hasSeen(id));

  const close = () => {
    markSeen(id);
    setOpen(false);
  };

  if (!steps.length) return null;

  return (
    <div className="mb-4">
      {open ? (
        <Card tint className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-tint text-accent">
                <Icon name="help" size={16} />
              </span>
              <p className="text-[15px] font-bold">{title}</p>
            </div>
            <button type="button" onClick={close} aria-label={t("common.close")} className="grid h-9 w-9 place-items-center text-muted">
              <Icon name="close" size={18} />
            </button>
          </div>
          <ol className="mt-3 flex flex-col gap-2">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">{s.title}</p>
                  <p className="text-[13px] leading-snug text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" onClick={close} className="mt-3 text-[14px] font-medium text-accent">
            {t("common.done")}
          </button>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-accent"
        >
          <Icon name="help" size={15} />
          {t("guide.howToUse")}
        </button>
      )}
    </div>
  );
}
