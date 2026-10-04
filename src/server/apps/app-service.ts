import type { DeviceAppState } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { canManageApps, requireDeviceViewPermission } from "@/server/auth/authorization";
import { parseDeviceCapabilities } from "@/server/devices/capabilities";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/http/api-error";
import type { DeviceCapability } from "@/types/contracts/device-capability";

export type DeviceAppView = {
  id: string;
  packageName: string;
  label: string;
  versionName: string | null;
  iconUrl: string | null;
  state: DeviceAppState;
  isSystem: boolean;
  canUninstall: boolean;
  canDisable: boolean;
};

export type AppCatalogView = {
  id: string;
  packageName: string;
  label: string;
  versionName: string | null;
  iconUrl: string | null;
};

export type DeviceAppsPageData = {
  deviceId: string;
  familyId: string;
  canManage: boolean;
  capabilities: DeviceCapability;
  apps: DeviceAppView[];
  catalog: AppCatalogView[];
};

async function requireDeviceInFamily(familyId: string, deviceId: string) {
  const device = await prisma.device.findFirst({
    where: { id: deviceId, familyId },
    select: {
      id: true,
      familyId: true,
      capabilities: true,
    },
  });

  if (!device) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }

  return device;
}

export async function getDeviceAppsPage(
  userId: string,
  familyId: string,
  deviceId: string,
): Promise<DeviceAppsPageData> {
  const membership = await requireDeviceViewPermission(userId, familyId);
  const device = await requireDeviceInFamily(familyId, deviceId);
  const [apps, catalog] = await Promise.all([
    prisma.deviceApp.findMany({
      where: { deviceId },
      orderBy: { label: "asc" },
      select: {
        id: true,
        packageName: true,
        label: true,
        versionName: true,
        iconUrl: true,
        state: true,
        isSystem: true,
        canUninstall: true,
        canDisable: true,
      },
    }),
    prisma.appCatalogEntry.findMany({
      orderBy: { label: "asc" },
      select: {
        id: true,
        packageName: true,
        label: true,
        versionName: true,
        iconUrl: true,
      },
    }),
  ]);

  const installedPackages = new Set(apps.map((app) => app.packageName));

  return {
    deviceId: device.id,
    familyId: device.familyId,
    canManage: canManageApps(membership.role),
    capabilities: parseDeviceCapabilities(device.capabilities),
    apps,
    catalog: catalog.filter((entry) => !installedPackages.has(entry.packageName)),
  };
}

export async function applyInstalledApp(
  tx: Prisma.TransactionClient,
  deviceId: string,
  input: {
    packageName: string;
    label: string;
    versionName?: string | null;
    iconUrl?: string | null;
    state?: DeviceAppState;
    isSystem?: boolean;
    canUninstall?: boolean;
    canDisable?: boolean;
  },
): Promise<void> {
  await tx.deviceApp.upsert({
    where: {
      deviceId_packageName: {
        deviceId,
        packageName: input.packageName,
      },
    },
    update: {
      label: input.label,
      versionName: input.versionName ?? null,
      iconUrl: input.iconUrl ?? null,
      state: input.state ?? "ENABLED",
      isSystem: input.isSystem ?? false,
      canUninstall: input.canUninstall ?? true,
      canDisable: input.canDisable ?? true,
    },
    create: {
      deviceId,
      packageName: input.packageName,
      label: input.label,
      versionName: input.versionName ?? null,
      iconUrl: input.iconUrl ?? null,
      state: input.state ?? "ENABLED",
      isSystem: input.isSystem ?? false,
      canUninstall: input.canUninstall ?? true,
      canDisable: input.canDisable ?? true,
    },
  });
}
