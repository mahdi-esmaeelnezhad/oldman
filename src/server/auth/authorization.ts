import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
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

export function canEnrollDevices(role: UserRole): boolean {
  switch (role) {
    case "OWNER":
    case "CAREGIVER":
    case "TECHNICAL_HELPER":
      return true;
    case "VIEWER":
      return false;
    default: {
      const exhaustive: never = role;
      throw new Error(`Unhandled role: ${String(exhaustive)}`);
    }
  }
}

export function canManageApps(role: UserRole): boolean {
  return canEnrollDevices(role);
}

export function canManageGeofences(role: UserRole): boolean {
  return canEnrollDevices(role);
}

export function canManageContacts(role: UserRole): boolean {
  return canEnrollDevices(role);
}

export function canManageSettings(role: UserRole): boolean {
  return canEnrollDevices(role);
}

export async function requireEnrollmentPermission(userId: string, familyId: string): Promise<FamilyAccess> {
  const membership = await requireFamilyMember(userId, familyId);
  if (!canEnrollDevices(membership.role)) {
    throw new AppError(403, "FORBIDDEN", "You cannot enroll a device for this family.");
  }

  return membership;
}

export async function requireAppManagementPermission(userId: string, familyId: string): Promise<FamilyAccess> {
  const membership = await requireFamilyMember(userId, familyId);
  if (!canManageApps(membership.role)) {
    throw new AppError(403, "FORBIDDEN", "You cannot manage apps for this family.");
  }

  return membership;
}

export async function requireGeofenceManagementPermission(
  userId: string,
  familyId: string,
): Promise<FamilyAccess> {
  const membership = await requireFamilyMember(userId, familyId);
  if (!canManageGeofences(membership.role)) {
    throw new AppError(403, "FORBIDDEN", "You cannot manage geofences for this family.");
  }

  return membership;
}

export async function requireContactManagementPermission(
  userId: string,
  familyId: string,
): Promise<FamilyAccess> {
  const membership = await requireFamilyMember(userId, familyId);
  if (!canManageContacts(membership.role)) {
    throw new AppError(403, "FORBIDDEN", "You cannot manage contacts for this family.");
  }

  return membership;
}

export async function requireSettingsManagementPermission(
  userId: string,
  familyId: string,
): Promise<FamilyAccess> {
  const membership = await requireFamilyMember(userId, familyId);
  if (!canManageSettings(membership.role)) {
    throw new AppError(403, "FORBIDDEN", "You cannot manage settings for this family.");
  }

  return membership;
}
