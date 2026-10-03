import type { Prisma } from "@/generated/prisma/client";
import { canManageContacts, requireFamilyMember } from "@/server/auth/authorization";
import { parseDeviceCapabilities } from "@/server/devices/capabilities";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/http/api-error";
import type { DeviceCapability } from "@/types/contracts/device-capability";

export type DeviceContactView = {
  id: string;
  contactId: string;
  displayName: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
};

export type DeviceContactsPage = {
  contacts: DeviceContactView[];
  canManage: boolean;
  capabilities: DeviceCapability;
};

function serializeContact(contact: {
  id: string;
  contactId: string;
  displayName: string;
  phoneNumber: string;
  createdAt: Date;
  updatedAt: Date;
}): DeviceContactView {
  return {
    id: contact.id,
    contactId: contact.contactId,
    displayName: contact.displayName,
    phoneNumber: contact.phoneNumber,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

export async function getDeviceContactsPage(
  userId: string,
  familyId: string,
  deviceId: string,
  search?: string,
): Promise<DeviceContactsPage> {
  const membership = await requireFamilyMember(userId, familyId);
  const device = await prisma.device.findFirst({
    where: { id: deviceId, familyId },
    select: { id: true, capabilities: true },
  });
  if (!device) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }

  const query = search?.trim();
  const contacts = await prisma.deviceContact.findMany({
    where: {
      deviceId,
      ...(query
        ? {
            OR: [
              { displayName: { contains: query, mode: "insensitive" } },
              { phoneNumber: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ displayName: "asc" }, { createdAt: "asc" }],
  });

  return {
    contacts: contacts.map(serializeContact),
    canManage: canManageContacts(membership.role),
    capabilities: parseDeviceCapabilities(device.capabilities),
  };
}

export async function applyCreatedContact(
  tx: Prisma.TransactionClient,
  deviceId: string,
  input: { contactId: string; displayName: string; phoneNumber: string },
): Promise<void> {
  await tx.deviceContact.upsert({
    where: {
      deviceId_contactId: {
        deviceId,
        contactId: input.contactId,
      },
    },
    create: {
      deviceId,
      contactId: input.contactId,
      displayName: input.displayName,
      phoneNumber: input.phoneNumber,
    },
    update: {
      displayName: input.displayName,
      phoneNumber: input.phoneNumber,
    },
  });
}

export async function applyUpdatedContact(
  tx: Prisma.TransactionClient,
  deviceId: string,
  input: { contactId: string; displayName?: string; phoneNumber?: string },
): Promise<void> {
  const existing = await tx.deviceContact.findUnique({
    where: {
      deviceId_contactId: {
        deviceId,
        contactId: input.contactId,
      },
    },
  });
  if (!existing) {
    return;
  }

  await tx.deviceContact.update({
    where: { id: existing.id },
    data: {
      displayName: input.displayName ?? existing.displayName,
      phoneNumber: input.phoneNumber ?? existing.phoneNumber,
    },
  });
}

export async function applyDeletedContact(
  tx: Prisma.TransactionClient,
  deviceId: string,
  contactId: string,
): Promise<void> {
  await tx.deviceContact.deleteMany({
    where: { deviceId, contactId },
  });
}
