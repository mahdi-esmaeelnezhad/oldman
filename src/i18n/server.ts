import { cookies } from "next/headers";
import { defaultLocale, localeCookieName, parseLocale, type AppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Dictionary } from "@/i18n/types";

export async function getRequestLocale(): Promise<AppLocale> {
  const jar = await cookies();
  return parseLocale(jar.get(localeCookieName)?.value ?? defaultLocale);
}

export type I18n = Dictionary & {
  locale: AppLocale;
  copy: Dictionary["copy"];
};

export async function getI18n(): Promise<I18n> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  return {
    locale,
    ...dictionary,
  };
}
