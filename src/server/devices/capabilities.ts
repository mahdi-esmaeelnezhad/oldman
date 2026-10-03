import { Prisma } from "@/generated/prisma/client";
import { defaultDeviceCapabilities } from "@/config/device-capabilities";
import type { DeviceCapability } from "@/types/contracts/device-capability";

export function parseDeviceCapabilities(value: Prisma.JsonValue | null | undefined): DeviceCapability {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...defaultDeviceCapabilities };
  }

  const record = value as Record<string, unknown>;
  return {
    ...defaultDeviceCapabilities,
    ...Object.fromEntries(
      Object.entries(defaultDeviceCapabilities).map(([key, fallback]) => {
        const next = record[key];
        return [key, typeof next === "boolean" ? next : fallback];
      }),
    ),
  } as DeviceCapability;
}
