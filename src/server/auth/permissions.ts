import type { UserRole } from "@/generated/prisma/enums";

export const familyPermissions = [
  "DEVICE_VIEW",
  "DEVICE_MANAGE",
  "APP_MANAGE",
  "CONTACT_MANAGE",
  "SETTINGS_MANAGE",
  "LOCATION_VIEW",
  "GEOFENCE_MANAGE",
  "SECURITY_MANAGE",
] as const;

export type FamilyPermission = (typeof familyPermissions)[number];

export const rolePermissions = {
  OWNER: familyPermissions,
  CAREGIVER: [
    "DEVICE_VIEW",
    "DEVICE_MANAGE",
    "APP_MANAGE",
    "CONTACT_MANAGE",
    "SETTINGS_MANAGE",
    "LOCATION_VIEW",
    "GEOFENCE_MANAGE",
  ],
  TECHNICAL_HELPER: [
    "DEVICE_VIEW",
    "DEVICE_MANAGE",
    "APP_MANAGE",
    "SETTINGS_MANAGE",
    "LOCATION_VIEW",
    "SECURITY_MANAGE",
  ],
  VIEWER: ["DEVICE_VIEW", "LOCATION_VIEW"],
} as const satisfies Record<UserRole, readonly FamilyPermission[]>;

export function roleHasPermission(role: UserRole, permission: FamilyPermission): boolean {
  return (rolePermissions[role] as readonly FamilyPermission[]).includes(permission);
}

export function permissionsForRole(role: UserRole): readonly FamilyPermission[] {
  return rolePermissions[role];
}
