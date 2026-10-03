import { copy } from "@/config/copy";

const apiErrorMessages = {
  INVALID_CREDENTIALS: "ایمیل یا رمز عبور درست نیست.",
  EMAIL_IN_USE: "این ایمیل قبلاً ثبت شده است.",
  VALIDATION_ERROR: "اطلاعات واردشده کامل نیست.",
  INVALID_JSON: "درخواست نامعتبر است.",
  FAMILY_NOT_FOUND: "این خانواده برای شما در دسترس نیست.",
  USER_NOT_FOUND: "کاربری با این ایمیل پیدا نشد.",
  ALREADY_A_MEMBER: "این کاربر از قبل عضو خانواده است.",
  FORBIDDEN: "اجازه این کار را ندارید.",
  UNAUTHENTICATED: "ابتدا وارد شوید.",
  ENROLLMENT_TOKEN_INVALID: "کد عضویت معتبر نیست.",
  DEVICE_IDENTIFIER_IN_USE: "این دستگاه قبلاً عضو شده است.",
  DEVICE_NOT_FOUND: "دستگاه پیدا نشد.",
  DEVICE_UNAUTHENTICATED: "اعتبار دستگاه معتبر نیست.",
  COMMAND_NOT_FOUND: "فرمان پیدا نشد.",
  COMMAND_UNSUPPORTED: "این فرمان روی دستگاه پشتیبانی نمی‌شود.",
  COMMAND_ALREADY_FINISHED: "این فرمان قبلاً تمام شده است.",
  APP_NOT_FOUND: "برنامه پیدا نشد.",
  APP_ALREADY_INSTALLED: "این برنامه از قبل نصب است.",
  APP_UNINSTALL_UNSUPPORTED: "حذف این برنامه پشتیبانی نمی‌شود.",
  APP_DISABLE_UNSUPPORTED: "تغییر وضعیت این برنامه پشتیبانی نمی‌شود.",
  GEOFENCE_NOT_FOUND: "ژئوفنس پیدا نشد.",
  NOTIFICATION_NOT_FOUND: "اعلان پیدا نشد.",
  LOCATION_SEARCH_FAILED: "جستجوی مکان انجام نشد.",
  CONTACT_NOT_FOUND: "مخاطب پیدا نشد.",
  SETTING_UNSUPPORTED: "این تنظیم روی دستگاه پشتیبانی نمی‌شود.",
  COMMAND_NOT_CANCELLABLE: "این فرمان در حال اجرا قابل لغو نیست.",
  INTERNAL_ERROR: copy.unexpectedError,
} as const;

export function messageForApiError(code: string | undefined): string {
  if (code && code in apiErrorMessages) {
    return apiErrorMessages[code as keyof typeof apiErrorMessages];
  }

  return copy.unexpectedError;
}
