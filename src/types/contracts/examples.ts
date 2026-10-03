import type { Command } from "@/types/contracts/command";
import type { CommandResult } from "@/types/contracts/command-result";
import type { DeviceCapability } from "@/types/contracts/device-capability";

export function contractExamples(): {
  battery: Command<"GET_BATTERY">;
  contact: Command<"CREATE_CONTACT">;
  batteryResult: CommandResult<"GET_BATTERY">;
  capability: DeviceCapability;
} {
  const battery: Command<"GET_BATTERY"> = {
    commandId: "command-battery",
    deviceId: "device-1",
    familyId: "family-1",
    createdBy: "user-1",
    type: "GET_BATTERY",
    payload: {},
    status: "PENDING",
    createdAt: "2026-10-03T00:00:00.000Z",
    expiresAt: "2026-10-03T00:05:00.000Z",
  };

  const contact: Command<"CREATE_CONTACT"> = {
    commandId: "command-contact",
    deviceId: "device-1",
    familyId: "family-1",
    createdBy: "user-1",
    type: "CREATE_CONTACT",
    payload: {
      displayName: "دکتر نمونه",
      phoneNumber: "+982100000000",
    },
    status: "PENDING",
    createdAt: "2026-10-03T00:00:00.000Z",
    expiresAt: "2026-10-03T00:05:00.000Z",
  };

  const batteryResult: CommandResult<"GET_BATTERY"> = {
    commandId: battery.commandId,
    deviceId: battery.deviceId,
    type: "GET_BATTERY",
    status: "SUCCESS",
    completedAt: "2026-10-03T00:01:00.000Z",
    data: {
      levelPercent: 80,
      charging: false,
    },
    error: null,
  };

  const capability: DeviceCapability = {
    GET_DEVICE_INFO: true,
    GET_BATTERY: true,
    GET_STORAGE: true,
    CREATE_CONTACT: true,
    UPDATE_CONTACT: true,
    DELETE_CONTACT: true,
    GET_INSTALLED_APPS: true,
    INSTALL_APP: false,
    UNINSTALL_APP: false,
    ENABLE_APP: false,
    DISABLE_APP: false,
    GET_LOCATION: true,
    CREATE_GEOFENCE: true,
    UPDATE_GEOFENCE: true,
    DELETE_GEOFENCE: true,
    GET_SETTINGS: true,
    SET_SETTING: false,
    silentInstall: false,
  };

  return { battery, contact, batteryResult, capability };
}
