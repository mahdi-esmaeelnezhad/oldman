"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { localeMeta, type AppLocale } from "@/i18n/config";
import type { ApiErrorCode, Dictionary } from "@/i18n/types";

export type I18nContextValue = Dictionary & {
  locale: AppLocale;
  direction: "rtl" | "ltr";
  dateLocale: string;
  formatDateTime: (value: Date) => string;
  messageForApiError: (code: string | undefined) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  locale: AppLocale;
  dictionary: Dictionary;
  children: ReactNode;
};

export function I18nProvider({ locale, dictionary, children }: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(() => {
    const meta = localeMeta[locale];
    const dateTimeFormat = new Intl.DateTimeFormat(meta.dateLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    });

    return {
      locale,
      direction: meta.direction,
      dateLocale: meta.dateLocale,
      ...dictionary,
      formatDateTime: (value: Date) => dateTimeFormat.format(value),
      messageForApiError: (code: string | undefined) => {
        if (code && code in dictionary.errors) {
          return dictionary.errors[code as ApiErrorCode];
        }
        return dictionary.errors.INTERNAL_ERROR;
      },
    };
  }, [dictionary, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return value;
}
