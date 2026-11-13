import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { Sheet } from "./Sheet";
import { Button } from "./ui";
import { useI18n } from "../lib/i18n";

/** Asks the user to refresh when a new version of the app is ready. */
export function UpdatePrompt() {
  const { t } = useI18n();
  const [waiting, setWaiting] = useState(false);
  const [reload, setReload] = useState<(() => void) | null>(null);

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setReload(() => () => void updateSW(true));
        setWaiting(true);
      },
    });
  }, []);

  return (
    <Sheet open={waiting} onClose={() => setWaiting(false)} title={t("settings.updateTitle")}>
      <div className="flex flex-col gap-3 pb-2">
        <p className="text-[14px] text-muted">{t("settings.updateBody")}</p>
        <Button full onClick={() => reload?.()}>
          {t("settings.updateAction")}
        </Button>
      </div>
    </Sheet>
  );
}
