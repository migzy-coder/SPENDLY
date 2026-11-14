import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mascot } from "./Mascot";
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

interface InstallPromptModalProps {
  open: boolean;
  onClose: () => void;
}

export function InstallPromptModal({ open, onClose }: InstallPromptModalProps) {
  const { locale } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!open || isStandalone()) return null;

  const handleInstallAndroidOrPc = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const ios = isIos();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Sheet Content */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative z-10 w-full max-w-md rounded-t-[28px] sm:rounded-[28px] bg-surface p-6 shadow-2xl"
        >
          {/* iOS Grabber */}
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-hairline" />

          <div className="flex flex-col items-center text-center">
            <Mascot pose="welcome" size={100} />
            <h3 className="mt-3 text-[22px] font-extrabold tracking-tight text-ink">
              {locale === "fr" ? "Installer Spendly" : "Install Spendly"}
            </h3>
            <p className="mt-1 text-[14px] leading-relaxed text-muted max-w-[300px]">
              {locale === "fr"
                ? "Installe l'app sur ton écran d'accueil pour recevoir tes rappels et ouvrir Spendly instantanément sans navigateur."
                : "Add to home screen to receive daily reminders and open instantly without a browser."}
            </p>
          </div>

          {ios ? (
            /* iOS 3-Step Guide */
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center gap-3.5 rounded-[16px] bg-soft p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-tint text-accent">
                  <Icon name="share" size={20} />
                </span>
                <div className="text-left">
                  <p className="text-[14px] font-bold text-ink">
                    {locale === "fr" ? "1. Touche Partager" : "1. Tap Share"}
                  </p>
                  <p className="text-[12px] text-muted">
                    {locale === "fr" ? "En bas de ton écran Safari" : "At the bottom of Safari"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-[16px] bg-soft p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-tint text-accent">
                  <Icon name="plus" size={20} />
                </span>
                <div className="text-left">
                  <p className="text-[14px] font-bold text-ink">
                    {locale === "fr" ? "2. « Sur l'écran d'accueil »" : "2. 'Add to Home Screen'"}
                  </p>
                  <p className="text-[12px] text-muted">
                    {locale === "fr" ? "Fais défiler la liste vers le bas" : "Scroll down the share sheet"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-[16px] bg-soft p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-tint text-accent">
                  <Icon name="check" size={20} />
                </span>
                <div className="text-left">
                  <p className="text-[14px] font-bold text-ink">
                    {locale === "fr" ? "3. Touche « Ajouter »" : "3. Tap 'Add'"}
                  </p>
                  <p className="text-[12px] text-muted">
                    {locale === "fr" ? "En haut à droite pour finaliser" : "In the top right corner"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Button full onClick={onClose}>
                  {locale === "fr" ? "C'est fait !" : "Done!"}
                </Button>
              </div>
            </div>
          ) : (
            /* Android / PC Direct Install */
            <div className="mt-6 flex flex-col gap-3">
              <Button full onClick={handleInstallAndroidOrPc}>
                <span className="flex items-center gap-2">
                  <Icon name="download" size={18} />
                  {locale === "fr" ? "Installer l'application" : "Install Application"}
                </span>
              </Button>
              <Button full variant="plain" onClick={onClose}>
                {locale === "fr" ? "Plus tard" : "Maybe later"}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
