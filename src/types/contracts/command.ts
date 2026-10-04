import type { CommandStatus } from "@/types/contracts/command-status";

export const commandTypes = [
  "GET_DEVICE_INFO",
  "GET_BATTERY",
  "GET_STORAGE",
  "CREATE_CONTACT",
  "UPDATE_CONTACT",
  "DELETE_CONTACT",
  "GET_INSTALLED_APPS",
  "INSTALL_APP",
  "UNINSTALL_APP",
  "ENABLE_APP",
  "DISABLE_APP",
  "GET_LOCATION",
  "CREATE_GEOFENCE",
  "UPDATE_GEOFENCE",
  "DELETE_GEOFENCE",
  "GET_SETTINGS",
  "SET_SETTING",
] as const;

export type CommandType = (typeof commandTypes)[number];

export type IsoDateTime = string;

export type NoPayload = Record<string, never>;

export type JsonSettingValue = string | number | boolean;

export type CommandPayloadByType = {
  GET_DEVICE_INFO: NoPayload;
  GET_BATTERY: NoPayload;
  GET_STORAGE: NoPayload;
  CREATE_CONTACT: {
    displayName: string;
    phoneNumber: string;
  };
  UPDATE_CONTACT: {
    contactId: string;
    displayName?: string;
    phoneNumber?: string;
  };
  DELETE_CONTACT: {
    contactId: string;
  };
  GET_INSTALLED_APPS: NoPayload;
  INSTALL_APP: {
    packageName: string;
  };
  UNINSTALL_APP: {
    packageName: string;
  };
  ENABLE_APP: {
    packageName: string;
  };
  DISABLE_APP: {
    packageName: string;
  };
  GET_LOCATION: NoPayload;
  CREATE_GEOFENCE: {
    geofenceId: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  UPDATE_GEOFENCE: {
    geofenceId: string;
    name?: string;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    enabled?: boolean;
  };
  DELETE_GEOFENCE: {
    geofenceId: string;
  };
  GET_SETTINGS: NoPayload;
  SET_SETTING: {
    key: string;
    value: JsonSettingValue;
  };
};

export type Command<T extends CommandType = CommandType> = {
  [K in T]: {
    commandId: string;
    deviceId: string;
    familyId: string;
    createdBy: string;
    type: K;
    payload: CommandPayloadByType[K];
    status: CommandStatus;
    createdAt: IsoDateTime;
    expiresAt: IsoDateTime;
  };
}[T];
