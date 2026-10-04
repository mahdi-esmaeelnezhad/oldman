import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit/audit-service";
import { requireFamilyMember, requireOwner } from "@/server/auth/authorization";
import { AppError } from "@/server/http/api-error";
import { normalizeEmail } from "@/server/users/normalize-email";

export type FamilySummary = {
  id: string;
  name: string;
  role: UserRole;
  memberCount: number;
  deviceCount: number;
};

export type FamilyMemberView = {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
};

export type FamilyDeviceView = {
  id: string;
  name: string;
  platform: "ANDROID";
  status: "PENDING" | "ONLINE" | "OFFLINE" | "DISABLED";
  lastSeenAt: string | null;
  manufacturer: string | null;
  model: string | null;
};

export type FamilyDetail = {
  id: string;
  name: string;
  role: UserRole;
  members: FamilyMemberView[];
  devices: FamilyDeviceView[];
};

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function listFamiliesForUser(userId: string): Promise<FamilySummary[]> {
  const memberships = await prisma.familyMember.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      family: {
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              members: true,
              devices: true,
            },
          },
        },
      },
    },
  });

  return memberships.map((membership) => ({
    id: membership.family.id,
    name: membership.family.name,
    role: membership.role,
    memberCount: membership.family._count.members,
    deviceCount: membership.family._count.devices,
  }));
}

export async function createFamily(userId: string, name: string): Promise<FamilySummary> {
  const family = await prisma.family.create({
    data: {
      name,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          members: true,
          devices: true,
        },
      },
    },
  });

  return {
    id: family.id,
    name: family.name,
    role: "OWNER",
    memberCount: family._count.members,
    deviceCount: family._count.devices,
  };
}

export async function getFamilyForUser(userId: string, familyId: string): Promise<FamilyDetail> {
  const access = await requireFamilyMember(userId, familyId);
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: {
      id: true,
      name: true,
      members: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      devices: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          platform: true,
          status: true,
          lastSeenAt: true,
          manufacturer: true,
          model: true,
        },
      },
    },
  });

  if (!family) {
    throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
  }

  return {
    id: family.id,
    name: family.name,
    role: access.role,
    members: family.members.map((member) => ({
      id: member.id,
      role: member.role,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      email: member.user.email,
    })),
    devices: family.devices.map((device) => ({
      id: device.id,
      name: device.name,
      platform: device.platform,
      status: device.status,
      lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
      manufacturer: device.manufacturer,
      model: device.model,
    })),
  };
}

export async function listFamilyMembers(userId: string, familyId: string): Promise<FamilyMemberView[]> {
  const family = await getFamilyForUser(userId, familyId);
  return family.members;
}

export async function inviteFamilyMember(
  userId: string,
  familyId: string,
  email: string,
  role: UserRole,
): Promise<FamilyMemberView> {
  await requireOwner(userId, familyId);
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "No user with that email was found.");
  }

  try {
    const member = await prisma.familyMember.create({
      data: {
        familyId,
        userId: user.id,
        role,
      },
      select: {
        id: true,
        role: true,
      },
    });

    await recordAuditLog({
      familyId,
      actorUserId: userId,
      action: "MEMBER_INVITED",
      status: "SUCCESS",
      result: "Family member invited",
      metadata: {
        invitedUserId: user.id,
        role: member.role,
      },
    });

    return {
      id: member.id,
      role: member.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, "ALREADY_A_MEMBER", "That user is already in the family.");
    }

    throw error;
  }
}
