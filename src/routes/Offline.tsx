import { useEffect, useState } from "react";
import { Mascot } from "../components/Mascot";
import { Button, Card } from "../components/ui";
import { useI18n } from "../lib/i18n";
import { flushQueue, onPendingChange } from "../lib/api";
import { currentTokenProvider } from "../lib/auth";

export function Offline() {
  const { t } = useI18n();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const off = onPendingChange((count) => setPending(count));
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      off();
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <Mascot pose="loading" size={180} />
      <h1 className="text-[26px] font-bold tracking-[-0.02em]">{t("offline.title")}</h1>
      <p className="max-w-[300px] text-[15px] text-muted">{t("offline.body")}</p>
      <Card className="w-full max-w-[320px] px-4 py-3 text-[15px]">
        {pending ? t("offline.pending", { count: pending }) : t("offline.sync")}
      </Card>
      <Button
        full
        className="max-w-[320px]"
        onClick={async () => {
          const provider = currentTokenProvider();
          if (provider) await flushQueue(async () => provider());
          setPending(0);
        }}
      >
        {t("offline.retry")}
      </Button>
      {!online ? <p className="text-[13px] text-muted">{t("common.offline")}</p> : null}
    </div>
  );
}
