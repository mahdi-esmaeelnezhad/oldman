export function formatDateTime(value: Date, dateLocale = "fa-IR"): string {
  return new Intl.DateTimeFormat(dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
