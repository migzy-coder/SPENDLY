import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { en } from "./en";
import { fr } from "./fr";
import type { Dictionary } from "./fr";

export type Locale = "fr" | "en";

const DICTIONARIES: Record<Locale, Dictionary> = { fr, en };

const STORAGE_KEY = "spendly.locale";

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  formatNumber: (value: number) => string;
  formatDate: (date: string, options?: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function lookup(dictionary: Dictionary, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = dictionary;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "fr" || stored === "en") return stored;
  } catch {
    /* private browsing */
  }
  return "fr";
}

export function I18nProvider({
  children,
  locale: controlled,
  onLocaleChange,
}: {
  children: ReactNode;
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
}) {
  const [local, setLocal] = useState<Locale>(() => controlled ?? readStoredLocale());
  const locale = controlled ?? local;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* private browsing */
      }
      if (onLocaleChange) onLocaleChange(next);
      if (!controlled) setLocal(next);
    },
    [controlled, onLocaleChange],
  );

  const value = useMemo<I18nValue>(() => {
    const dictionary = DICTIONARIES[locale] ?? fr;
    const t = (path: string, params?: Record<string, string | number>) => {
      const found = lookup(dictionary, path) ?? lookup(fr, path) ?? path;
      if (!params) return found;
      return found.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in params ? String(params[key]) : match,
      );
    };
    return {
      locale,
      setLocale,
      t,
      formatNumber: (input: number) => new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB").format(input),
      formatDate: (date: string, options?: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", options).format(new Date(`${date}T12:00:00Z`)),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
