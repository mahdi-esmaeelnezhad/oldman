import { locale } from "@/config/locale";

const byteFormat = new Intl.NumberFormat(locale.dateLocale, {
  maximumFractionDigits: 1,
});

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(value: string | number | bigint | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const bytes = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return null;
  }

  let amount = bytes;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < UNITS.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return `${byteFormat.format(amount)} ${UNITS[unitIndex]}`;
}

export function storageUsedPercent(
  totalBytes: string | number | bigint | null | undefined,
  availableBytes: string | number | bigint | null | undefined,
): number | null {
  if (totalBytes === null || totalBytes === undefined) {
    return null;
  }
  if (availableBytes === null || availableBytes === undefined) {
    return null;
  }

  const total = Number(totalBytes);
  const available = Number(availableBytes);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(available) || available < 0) {
    return null;
  }

  const used = Math.max(0, Math.min(100, ((total - available) / total) * 100));
  return Math.round(used);
}
