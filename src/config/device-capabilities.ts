import type { CommandType } from "@/types/contracts/command";
import type { DeviceCapability } from "@/types/contracts/device-capability";

export const defaultDeviceCapabilities = {
  GET_DEVICE_INFO: false,
  GET_BATTERY: false,
  GET_STORAGE: false,
  CREATE_CONTACT: false,
  UPDATE_CONTACT: false,
  DELETE_CONTACT: false,
  GET_INSTALLED_APPS: false,
  INSTALL_APP: false,
  UNINSTALL_APP: false,
  ENABLE_APP: false,
  DISABLE_APP: false,
  GET_LOCATION: false,
  CREATE_GEOFENCE: false,
  UPDATE_GEOFENCE: false,
  DELETE_GEOFENCE: false,
  GET_SETTINGS: false,
  SET_SETTING: false,
  silentInstall: false,
} as const satisfies DeviceCapability;

export const demoDeviceCapabilities = {
  ...defaultDeviceCapabilities,
  GET_DEVICE_INFO: true,
  GET_BATTERY: true,
  GET_STORAGE: true,
  CREATE_CONTACT: true,
  UPDATE_CONTACT: true,
  DELETE_CONTACT: true,
  GET_INSTALLED_APPS: true,
  INSTALL_APP: true,
  UNINSTALL_APP: true,
  ENABLE_APP: true,
  DISABLE_APP: true,
  GET_LOCATION: true,
  CREATE_GEOFENCE: true,
  UPDATE_GEOFENCE: true,
  DELETE_GEOFENCE: true,
  GET_SETTINGS: true,
  SET_SETTING: true,
  silentInstall: false,
} as const satisfies DeviceCapability;

export const appCommandTypes = ["INSTALL_APP", "UNINSTALL_APP", "ENABLE_APP", "DISABLE_APP"] as const;

export type AppCommandType = (typeof appCommandTypes)[number];

export function isAppCommandType(type: CommandType): type is AppCommandType {
  return (appCommandTypes as readonly string[]).includes(type);
}

export const contactCommandTypes = ["CREATE_CONTACT", "UPDATE_CONTACT", "DELETE_CONTACT"] as const;

export type ContactCommandType = (typeof contactCommandTypes)[number];

export function isContactCommandType(type: CommandType): type is ContactCommandType {
  return (contactCommandTypes as readonly string[]).includes(type);
}

export const settingsCommandTypes = ["GET_SETTINGS", "SET_SETTING"] as const;

export type SettingsCommandType = (typeof settingsCommandTypes)[number];

export function isSettingsCommandType(type: CommandType): type is SettingsCommandType {
  return (settingsCommandTypes as readonly string[]).includes(type);
}
