import type { DeviceSettingSection } from "@/generated/prisma/enums";
import type { JsonSettingValue } from "@/types/contracts/command";

export type DeviceSettingValueType = "string" | "number" | "boolean";

export type DeviceSettingDefinition = {
  key: string;
  section: DeviceSettingSection;
  valueType: DeviceSettingValueType;
  writable: boolean;
};

export const deviceSettingDefinitions = [
  { key: "device_name", section: "DEVICE", valueType: "string", writable: true },
  { key: "screen_timeout_seconds", section: "DEVICE", valueType: "number", writable: true },
  { key: "developer_options", section: "DEVICE", valueType: "boolean", writable: false },
  { key: "wifi_enabled", section: "NETWORK", valueType: "boolean", writable: true },
  { key: "mobile_data_enabled", section: "NETWORK", valueType: "boolean", writable: true },
  { key: "airplane_mode", section: "NETWORK", valueType: "boolean", writable: false },
  { key: "brightness", section: "DISPLAY", valueType: "number", writable: true },
  { key: "auto_brightness", section: "DISPLAY", valueType: "boolean", writable: true },
  { key: "font_scale", section: "DISPLAY", valueType: "number", writable: true },
  { key: "ring_volume", section: "SOUND", valueType: "number", writable: true },
  { key: "media_volume", section: "SOUND", valueType: "number", writable: true },
  { key: "do_not_disturb", section: "SOUND", valueType: "boolean", writable: true },
  { key: "screen_lock_enabled", section: "SECURITY", valueType: "boolean", writable: true },
  { key: "unknown_sources", section: "SECURITY", valueType: "boolean", writable: false },
  { key: "install_unknown_apps", section: "APPLICATIONS", valueType: "boolean", writable: true },
  { key: "auto_update_apps", section: "APPLICATIONS", valueType: "boolean", writable: true },
] as const satisfies readonly DeviceSettingDefinition[];

export const deviceSettingSections = [
  "DEVICE",
  "NETWORK",
  "DISPLAY",
  "SOUND",
  "SECURITY",
  "APPLICATIONS",
] as const satisfies readonly DeviceSettingSection[];

export type KnownDeviceSettingKey = (typeof deviceSettingDefinitions)[number]["key"];

const definitionByKey = new Map<string, DeviceSettingDefinition>(
  deviceSettingDefinitions.map((definition) => [definition.key, definition]),
);

export function getDeviceSettingDefinition(key: string): DeviceSettingDefinition | null {
  return definitionByKey.get(key) ?? null;
}

export function isValidSettingValue(
  definition: DeviceSettingDefinition,
  value: JsonSettingValue,
): boolean {
  switch (definition.valueType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    default: {
      const exhaustive: never = definition.valueType;
      throw new Error(`Unhandled setting value type: ${String(exhaustive)}`);
    }
  }
}

/** Demo device supports these keys; airplane_mode and unknown_sources are intentionally omitted. */
export const demoDeviceSettings: ReadonlyArray<{
  key: KnownDeviceSettingKey;
  value: JsonSettingValue;
}> = [
  { key: "device_name", value: "مادر" },
  { key: "screen_timeout_seconds", value: 60 },
  { key: "developer_options", value: false },
  { key: "wifi_enabled", value: true },
  { key: "mobile_data_enabled", value: true },
  { key: "brightness", value: 70 },
  { key: "auto_brightness", value: true },
  { key: "font_scale", value: 1.15 },
  { key: "ring_volume", value: 6 },
  { key: "media_volume", value: 8 },
  { key: "do_not_disturb", value: false },
  { key: "screen_lock_enabled", value: true },
  { key: "install_unknown_apps", value: false },
  { key: "auto_update_apps", value: true },
];
