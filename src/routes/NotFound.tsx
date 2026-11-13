import { Link } from "react-router";
import { Mascot } from "../components/Mascot";
import { Button } from "../components/ui";
import { useI18n } from "../lib/i18n";

export function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <Mascot pose="details" size={170} />
      <h1 className="text-[26px] font-bold tracking-[-0.02em]">{t("errors.title")}</h1>
      <p className="max-w-[280px] text-[15px] text-muted">{t("errors.body")}</p>
      <Link to="/today" className="w-full max-w-[320px]">
        <Button full>{t("errors.goHome")}</Button>
      </Link>
    </div>
  );
}
