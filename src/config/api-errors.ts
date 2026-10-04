import type { ApiErrorCode } from "@/i18n/types";
import { getDictionary } from "@/i18n/get-dictionary";
import { defaultLocale } from "@/i18n/config";

/** Fallback messages (Persian). Prefer useI18n().messageForApiError in UI. */
const fallback = getDictionary(defaultLocale);

export function messageForApiError(
  code: string | undefined,
  errors: Record<ApiErrorCode, string> = fallback.errors,
): string {
  if (code && code in errors) {
    return errors[code as ApiErrorCode];
  }
  return errors.INTERNAL_ERROR;
}
