import { locale } from "@/config/locale";

const dateTimeFormat = new Intl.DateTimeFormat(locale.dateLocale, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value: Date): string {
  return dateTimeFormat.format(value);
}
