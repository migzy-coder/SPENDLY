import { Link } from "react-router";
import { Mascot } from "../components/Mascot";
import { Button, Card } from "../components/ui";
import { useI18n } from "../lib/i18n";
import { Icon } from "../components/Icon";

export function Welcome() {
  const { t, locale, setLocale } = useI18n();

  return (
    <div className="flex min-h-full flex-col px-6 pt-safe pb-[max(env(safe-area-inset-bottom,0px),24px)]">
      <div className="flex items-center justify-between py-4">
        <span className="text-[15px] font-semibold">Spendly</span>
        <button
          type="button"
          onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
          className="flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium shadow-card"
        >
          <Icon name="globe" size={15} />
          {locale === "fr" ? "English" : "Français"}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
        <Mascot pose="welcome" size={230} />
        <h1 className="max-w-[320px] text-[32px] leading-tight font-bold tracking-[-0.03em]">
          {t("welcome.title")}
        </h1>
        <p className="max-w-[300px] text-[15px] leading-relaxed text-muted">{t("welcome.body")}</p>

        <ul className="mt-2 flex w-full max-w-[320px] flex-col gap-2">
          {[t("welcome.bullet1"), t("welcome.bullet2"), t("welcome.bullet3")].map((item) => (
            <li key={item}>
              <Card className="flex items-center gap-3 px-4 py-3 text-left">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-tint text-accent">
                  <Icon name="check" size={16} strokeWidth={2.4} />
                </span>
                <span className="text-[15px] font-medium">{item}</span>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <Link to="/signup">
          <Button full>{t("welcome.cta")}</Button>
        </Link>
        <Link to="/signin">
          <Button full variant="plain">
            {t("welcome.haveAccount")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
