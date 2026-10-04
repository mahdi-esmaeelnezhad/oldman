export type ApiErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_IN_USE"
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "FAMILY_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "ALREADY_A_MEMBER"
  | "FORBIDDEN"
  | "UNAUTHENTICATED"
  | "ENROLLMENT_TOKEN_INVALID"
  | "DEVICE_IDENTIFIER_IN_USE"
  | "DEVICE_NOT_FOUND"
  | "DEVICE_UNAUTHENTICATED"
  | "COMMAND_NOT_FOUND"
  | "COMMAND_UNSUPPORTED"
  | "COMMAND_ALREADY_FINISHED"
  | "APP_NOT_FOUND"
  | "APP_ALREADY_INSTALLED"
  | "APP_UNINSTALL_UNSUPPORTED"
  | "APP_DISABLE_UNSUPPORTED"
  | "GEOFENCE_NOT_FOUND"
  | "NOTIFICATION_NOT_FOUND"
  | "LOCATION_SEARCH_FAILED"
  | "CONTACT_NOT_FOUND"
  | "SETTING_UNSUPPORTED"
  | "COMMAND_NOT_CANCELLABLE"
  | "INTERNAL_ERROR";

export type Dictionary = {
  brandName: string;
  brandDescription: string;
  copy: Record<string, string>;
  roleLabels: Record<string, string>;
  deviceStatusLabels: Record<string, string>;
  deviceOwnerLabels: Record<string, string>;
  deviceAppStateLabels: Record<string, string>;
  commandStatusLabels: Record<string, string>;
  commandTypeLabels: Record<string, string>;
  platformLabels: Record<string, string>;
  locationPermissionLabels: Record<string, string>;
  locationServiceLabels: Record<string, string>;
  geofenceEventLabels: Record<string, string>;
  deviceSettingSectionLabels: Record<string, string>;
  deviceSettingKeyLabels: Record<string, string>;
  errors: Record<ApiErrorCode, string>;
};
