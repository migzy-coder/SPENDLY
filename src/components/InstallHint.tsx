import { useEffect, useState } from "react";
import { Button } from "./ui";
import { Icon } from "./Icon";
import { useI18n } from "../lib/i18n";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/**
 * Android gets a real install button, iPhone Safari gets the
 * "Share, then Add to Home Screen" hint.
 */
export function InstallHint() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed || isStandalone()) return null;

  if (prompt) {
    return (
      <div className="mx-5 mb-3 flex items-center gap-3 rounded-[18px] bg-surface px-4 py-3 shadow-card">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-accent-tint text-accent">
          <Icon name="download" size={19} />
        </span>
        <p className="min-w-0 flex-1 text-[14px] font-medium">{t("pwa.install")}</p>
        <Button
          size="md"
          onClick={async () => {
            await prompt.prompt();
            await prompt.userChoice;
            setPrompt(null);
          }}
        >
          {t("pwa.installAction")}
        </Button>
      </div>
    );
  }

  if (isIos()) {
    return (
      <div className="mx-5 mb-3 flex items-center gap-3 rounded-[18px] bg-surface px-4 py-3 shadow-card">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-accent-tint text-accent">
          <Icon name="share" size={19} />
        </span>
        <p className="min-w-0 flex-1 text-[14px] leading-snug">{t("pwa.iosHint")}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t("common.close")}
          className="grid h-10 w-10 shrink-0 place-items-center text-muted"
        >
          <Icon name="close" size={17} />
        </button>
      </div>
    );
  }

  return null;
}
