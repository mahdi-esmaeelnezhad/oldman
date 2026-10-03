import type { DevicePlatform, DeviceStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireFamilyMember } from "@/server/auth/authorization";
import { AppError } from "@/server/http/api-error";

export type DeviceDashboard = {
  id: string;
  familyId: string;
  name: string;
  platform: DevicePlatform;
  status: DeviceStatus;
  lastSeenAt: string | null;
  manufacturer: string | null;
  model: string | null;
  androidVersion: string | null;
  androidSdk: number | null;
  appVersion: string | null;
  batteryLevelPercent: number | null;
  batteryCharging: boolean | null;
  storageTotalBytes: string | null;
  storageAvailableBytes: string | null;
  isDeviceOwner: boolean | null;
};

function serializeBytes(value: bigint | null): string | null {
  return value === null ? null : value.toString();
}

export async function getDeviceForUser(
  userId: string,
  familyId: string,
  deviceId: string,
): Promise<DeviceDashboard> {
  await requireFamilyMember(userId, familyId);

  const device = await prisma.device.findFirst({
    where: {
      id: deviceId,
      familyId,
    },
    select: {
      id: true,
      familyId: true,
      name: true,
      platform: true,
      status: true,
      lastSeenAt: true,
      manufacturer: true,
      model: true,
      androidVersion: true,
      androidSdk: true,
      appVersion: true,
      batteryLevelPercent: true,
      batteryCharging: true,
      storageTotalBytes: true,
      storageAvailableBytes: true,
      isDeviceOwner: true,
    },
  });

  if (!device) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }

  return {
    id: device.id,
    familyId: device.familyId,
    name: device.name,
    platform: device.platform,
    status: device.status,
    lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
    manufacturer: device.manufacturer,
    model: device.model,
    androidVersion: device.androidVersion,
    androidSdk: device.androidSdk,
    appVersion: device.appVersion,
    batteryLevelPercent: device.batteryLevelPercent,
    batteryCharging: device.batteryCharging,
    storageTotalBytes: serializeBytes(device.storageTotalBytes),
    storageAvailableBytes: serializeBytes(device.storageAvailableBytes),
    isDeviceOwner: device.isDeviceOwner,
  };
}
