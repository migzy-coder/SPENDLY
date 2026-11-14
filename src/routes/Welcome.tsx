import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Mascot } from "../components/Mascot";
import { Button, Card } from "../components/ui";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import { Icon } from "../components/Icon";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export function Welcome() {
  const { t, locale, setLocale } = useI18n();
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/plan", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="flex min-h-full flex-col px-6 pt-safe pb-[max(env(safe-area-inset-bottom,0px),24px)]">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex items-center justify-between py-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-[17px] font-bold tracking-tight text-ink">Spendly</span>
        </div>
        <button
          type="button"
          onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
          className="flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium shadow-card transition-transform active:scale-95"
        >
          <Icon name="globe" size={15} />
          {locale === "fr" ? "English" : "Français"}
        </button>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.05 }}
          className="relative"
        >
          <div className="absolute inset-0 -z-10 rounded-full bg-accent/10 blur-2xl filter" />
          <Mascot pose="welcome" size={210} />
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="max-w-[320px] text-[32px] leading-tight font-extrabold tracking-[-0.03em] text-ink"
        >
          {t("welcome.title")}
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="max-w-[300px] text-[15px] leading-relaxed text-muted"
        >
          {t("welcome.body")}
        </motion.p>

        <motion.ul variants={itemVariants} className="mt-2 flex w-full max-w-[320px] flex-col gap-2.5">
          {[t("welcome.bullet1"), t("welcome.bullet2"), t("welcome.bullet3")].map((item) => (
            <motion.li
              key={item}
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Card className="flex items-center gap-3 px-4 py-3 text-left transition-shadow hover:shadow-md">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-tint text-accent">
                  <Icon name="check" size={16} strokeWidth={2.6} />
                </span>
                <span className="text-[15px] font-medium text-ink">{item}</span>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4, type: "spring", stiffness: 260, damping: 22 }}
        className="flex flex-col gap-2 pt-2"
      >
        <Button full onClick={() => navigate("/signup")}>
          {t("welcome.cta")}
        </Button>
        <Button full variant="plain" onClick={() => navigate("/signin")}>
          {t("welcome.haveAccount")}
        </Button>
      </motion.div>
    </div>
  );
}
