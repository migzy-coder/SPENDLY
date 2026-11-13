import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useI18n } from "../lib/i18n";

/**
 * A bottom sheet with the iOS feel: grabber, dimmed backdrop, spring motion
 * and a drag down to dismiss.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy?: string;
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/45"
            aria-label={t("common.close")}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={labelledBy ? undefined : title}
            aria-labelledby={labelledBy}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) onClose();
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="relative flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-surface shadow-[0_-10px_40px_rgba(0,0,0,0.18)]"
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="h-1.5 w-9 rounded-full bg-ink/20" aria-hidden="true" />
            </div>
            {title ? (
              <h2 className="px-5 pt-1 pb-3 text-[20px] font-bold tracking-[-0.01em]">{title}</h2>
            ) : null}
            <div className="app-scroll flex-1 px-5">{children}</div>
            <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),20px)]">{footer}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
