export const locales = ["fa", "en", "ar"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "fa";

export const localeCookieName = "NEXT_LOCALE";

export type LocaleDirection = "rtl" | "ltr";

export const localeMeta: Record<
  AppLocale,
  { direction: LocaleDirection; dateLocale: string; nativeLabel: string }
> = {
  fa: { direction: "rtl", dateLocale: "fa-IR", nativeLabel: "فارسی" },
  en: { direction: "ltr", dateLocale: "en-US", nativeLabel: "English" },
  ar: { direction: "rtl", dateLocale: "ar", nativeLabel: "العربية" },
};

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return Boolean(value && (locales as readonly string[]).includes(value));
}

export function parseLocale(value: string | undefined | null): AppLocale {
  return isAppLocale(value) ? value : defaultLocale;
}
