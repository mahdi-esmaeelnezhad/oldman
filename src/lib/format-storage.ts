const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(
  value: string | number | bigint | null | undefined,
  dateLocale = "fa-IR",
): string | null {
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

  const byteFormat = new Intl.NumberFormat(dateLocale, {
    maximumFractionDigits: 1,
  });

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

  const total = typeof totalBytes === "bigint" ? Number(totalBytes) : Number(totalBytes);
  const available =
    typeof availableBytes === "bigint" ? Number(availableBytes) : Number(availableBytes);
  if (!Number.isFinite(total) || !Number.isFinite(available) || total <= 0) {
    return null;
  }

  const used = Math.max(0, total - available);
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)));
}
