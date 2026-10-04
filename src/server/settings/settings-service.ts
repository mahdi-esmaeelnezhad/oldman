import type { Prisma } from "@/generated/prisma/client";
import {
  getDeviceSettingDefinition,
  isValidSettingValue,
} from "@/config/device-settings";
import {
  canManageSecurity,
  canManageSettings,
  requireDeviceViewPermission,
} from "@/server/auth/authorization";
import { parseDeviceCapabilities } from "@/server/devices/capabilities";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/http/api-error";
import type { DeviceCapability } from "@/types/contracts/device-capability";
import type { JsonSettingValue } from "@/types/contracts/command";
import type { DeviceSettingSection } from "@/generated/prisma/enums";

export type DeviceSettingView = {
  key: string;
  section: DeviceSettingSection;
  value: JsonSettingValue;
  writable: boolean;
  valueType: "string" | "number" | "boolean";
  active: boolean;
};

export type DeviceSettingsPage = {
  settings: DeviceSettingView[];
  sections: DeviceSettingSection[];
  canManage: boolean;
  capabilities: DeviceCapability;
};

function parseJsonSettingValue(value: Prisma.JsonValue): JsonSettingValue | null {
  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

export async function getDeviceSettingsPage(
  userId: string,
  familyId: string,
  deviceId: string,
): Promise<DeviceSettingsPage> {
  const membership = await requireDeviceViewPermission(userId, familyId);
  const device = await prisma.device.findFirst({
    where: { id: deviceId, familyId },
    select: { id: true, capabilities: true },
  });
  if (!device) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }

  const capabilities = parseDeviceCapabilities(device.capabilities);
  const canManageNonSecurity = canManageSettings(membership.role);
  const canManageSecuritySettings = canManageSecurity(membership.role);
  const canManage = canManageNonSecurity || canManageSecuritySettings;
  const rows = await prisma.deviceSetting.findMany({
    where: { deviceId },
    orderBy: [{ section: "asc" }, { key: "asc" }],
  });

  const settings: DeviceSettingView[] = [];
  for (const row of rows) {
    const definition = getDeviceSettingDefinition(row.key);
    if (!definition) {
      continue;
    }
    const value = parseJsonSettingValue(row.value);
    if (value === null || !isValidSettingValue(definition, value)) {
      continue;
    }

    const writable = row.writable && definition.writable;
    const canEditSetting =
      definition.section === "SECURITY" ? canManageSecuritySettings : canManageNonSecurity;
    settings.push({
      key: row.key,
      section: row.section,
      value,
      writable,
      valueType: definition.valueType,
      active: Boolean(canEditSetting && capabilities.SET_SETTING && writable),
    });
  }

  const sections = [...new Set(settings.map((setting) => setting.section))];

  return {
    settings,
    sections,
    canManage,
    capabilities,
  };
}

export async function applySettingsSnapshot(
  tx: Prisma.TransactionClient,
  deviceId: string,
  settings: Readonly<Record<string, JsonSettingValue>>,
): Promise<void> {
  const supportedEntries = Object.entries(settings).flatMap(([key, value]) => {
    const definition = getDeviceSettingDefinition(key);
    if (!definition || !isValidSettingValue(definition, value)) {
      return [];
    }
    return [{ key, value, definition }];
  });

  await tx.deviceSetting.deleteMany({
    where: {
      deviceId,
      key: { notIn: supportedEntries.map((entry) => entry.key) },
    },
  });

  for (const entry of supportedEntries) {
    await tx.deviceSetting.upsert({
      where: {
        deviceId_key: {
          deviceId,
          key: entry.key,
        },
      },
      create: {
        deviceId,
        key: entry.key,
        section: entry.definition.section,
        value: entry.value,
        writable: entry.definition.writable,
      },
      update: {
        section: entry.definition.section,
        value: entry.value,
        writable: entry.definition.writable,
      },
    });
  }
}

export async function applySettingValue(
  tx: Prisma.TransactionClient,
  deviceId: string,
  key: string,
  value: JsonSettingValue,
): Promise<void> {
  const definition = getDeviceSettingDefinition(key);
  if (!definition || !isValidSettingValue(definition, value)) {
    return;
  }

  await tx.deviceSetting.upsert({
    where: {
      deviceId_key: {
        deviceId,
        key,
      },
    },
    create: {
      deviceId,
      key,
      section: definition.section,
      value,
      writable: definition.writable,
    },
    update: {
      value,
      section: definition.section,
      writable: definition.writable,
    },
  });
}
