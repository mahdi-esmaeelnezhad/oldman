import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import fa from "@/i18n/messages/fa";
import en from "@/i18n/messages/en";
import ar from "@/i18n/messages/ar";

const dictionaries = { fa, en, ar } satisfies Record<AppLocale, Dictionary>;

export function getDictionary(locale: AppLocale): Dictionary {
  return dictionaries[locale];
}
