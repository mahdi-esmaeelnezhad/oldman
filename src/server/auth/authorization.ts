import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  roleHasPermission,
  type FamilyPermission,
} from "@/server/auth/permissions";
import { AppError } from "@/server/http/api-error";

export type FamilyAccess = {
  familyId: string;
  role: UserRole;
};

export async function requireFamilyMember(userId: string, familyId: string): Promise<FamilyAccess> {
  const membership = await prisma.familyMember.findUnique({
    where: {
      familyId_userId: {
        familyId,
        userId,
      },
    },
    select: {
      familyId: true,
      role: true,
    },
  });

  if (!membership) {
    throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
  }

  return membership;
}

export async function requirePermission(
  userId: string,
  familyId: string,
  permission: FamilyPermission,
): Promise<FamilyAccess> {
  const membership = await requireFamilyMember(userId, familyId);
  if (!roleHasPermission(membership.role, permission)) {
    throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action.");
  }

  return membership;
}

export async function requireOwner(userId: string, familyId: string): Promise<FamilyAccess> {
  const membership = await requireFamilyMember(userId, familyId);
  if (!canInviteMembers(membership.role)) {
    throw new AppError(403, "FORBIDDEN", "Only the family owner can do this.");
  }

  return membership;
}

export function canInviteMembers(role: UserRole): boolean {
  return role === "OWNER";
}

export function canViewDevice(role: UserRole): boolean {
  return roleHasPermission(role, "DEVICE_VIEW");
}

export function canManageDevice(role: UserRole): boolean {
  return roleHasPermission(role, "DEVICE_MANAGE");
}

export function canEnrollDevices(role: UserRole): boolean {
  return roleHasPermission(role, "DEVICE_MANAGE");
}

export function canManageApps(role: UserRole): boolean {
  return roleHasPermission(role, "APP_MANAGE");
}

export function canManageGeofences(role: UserRole): boolean {
  return roleHasPermission(role, "GEOFENCE_MANAGE");
}

export function canManageContacts(role: UserRole): boolean {
  return roleHasPermission(role, "CONTACT_MANAGE");
}

export function canManageSettings(role: UserRole): boolean {
  return roleHasPermission(role, "SETTINGS_MANAGE");
}

export function canManageSecurity(role: UserRole): boolean {
  return roleHasPermission(role, "SECURITY_MANAGE");
}

export function canViewLocation(role: UserRole): boolean {
  return roleHasPermission(role, "LOCATION_VIEW");
}

export async function requireEnrollmentPermission(userId: string, familyId: string): Promise<FamilyAccess> {
  return requirePermission(userId, familyId, "DEVICE_MANAGE");
}

export async function requireDeviceViewPermission(userId: string, familyId: string): Promise<FamilyAccess> {
  return requirePermission(userId, familyId, "DEVICE_VIEW");
}

export async function requireDeviceManagePermission(userId: string, familyId: string): Promise<FamilyAccess> {
  return requirePermission(userId, familyId, "DEVICE_MANAGE");
}

export async function requireAppManagementPermission(userId: string, familyId: string): Promise<FamilyAccess> {
  return requirePermission(userId, familyId, "APP_MANAGE");
}

export async function requireGeofenceManagementPermission(
  userId: string,
  familyId: string,
): Promise<FamilyAccess> {
  return requirePermission(userId, familyId, "GEOFENCE_MANAGE");
}

export async function requireContactManagementPermission(
  userId: string,
  familyId: string,
): Promise<FamilyAccess> {
  return requirePermission(userId, familyId, "CONTACT_MANAGE");
}

export async function requireSettingsManagementPermission(
  userId: string,
  familyId: string,
): Promise<FamilyAccess> {
  return requirePermission(userId, familyId, "SETTINGS_MANAGE");
}

export async function requireSecurityManagementPermission(
  userId: string,
  familyId: string,
): Promise<FamilyAccess> {
  return requirePermission(userId, familyId, "SECURITY_MANAGE");
}

export async function requireLocationViewPermission(userId: string, familyId: string): Promise<FamilyAccess> {
  return requirePermission(userId, familyId, "LOCATION_VIEW");
}
