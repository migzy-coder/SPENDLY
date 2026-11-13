import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ToastValue = {
  show: (message: ReactNode, options?: { duration?: number }) => void;
};

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ReactNode>(null);
  const [visible, setVisible] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);

  const show = useCallback((content: ReactNode, options?: { duration?: number }) => {
    setMessage(content);
    setVisible(true);
    if (timer) window.clearTimeout(timer);
    const handle = window.setTimeout(() => setVisible(false), options?.duration ?? 2600);
    setTimer(handle);
  }, [timer]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[max(env(safe-area-inset-top,0px),12px)]">
        <AnimatePresence>
          {visible ? (
            <motion.div
              role="status"
              aria-live="polite"
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -80, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="pointer-events-auto w-full max-w-[380px] rounded-[18px] border border-hairline bg-surface px-4 py-3 text-[15px] shadow-[0_10px_30px_rgba(47,107,240,0.25)]"
            >
              {message}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
