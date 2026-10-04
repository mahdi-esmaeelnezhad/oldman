"use server";

import { cookies } from "next/headers";
import { localeCookieName, parseLocale, type AppLocale } from "@/i18n/config";

export async function setLocaleAction(locale: AppLocale): Promise<void> {
  const jar = await cookies();
  jar.set(localeCookieName, parseLocale(locale), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
