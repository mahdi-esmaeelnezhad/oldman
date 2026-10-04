import { defaultLocale, localeMeta } from "@/i18n/config";

/** Sync fallback for rare non-request contexts. Prefer getRequestLocale / useI18n. */
export const locale = {
  language: defaultLocale,
  direction: localeMeta[defaultLocale].direction,
  dateLocale: localeMeta[defaultLocale].dateLocale,
} as const;
