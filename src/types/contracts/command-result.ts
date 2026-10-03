import type { CommandResultStatus } from "@/types/contracts/command-status";
import type { CommandType, IsoDateTime, JsonSettingValue } from "@/types/contracts/command";

export type CommandError = {
  code: string;
  message: string;
};

export type InstalledAppSummary = {
  packageName: string;
  label: string;
};

export type CommandResultDataByType = {
  GET_DEVICE_INFO: {
    manufacturer: string | null;
    model: string | null;
    androidVersion: string | null;
    androidSdk: number | null;
    appVersion: string | null;
  };
  GET_BATTERY: {
    levelPercent: number;
    charging: boolean;
  };
  GET_STORAGE: {
    totalBytes: number;
    availableBytes: number;
  };
  CREATE_CONTACT: {
    contactId: string;
  };
  UPDATE_CONTACT: {
    contactId: string;
  };
  DELETE_CONTACT: {
    contactId: string;
  };
  GET_INSTALLED_APPS: {
    apps: readonly InstalledAppSummary[];
  };
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
  GET_LOCATION: {
    latitude: number;
    longitude: number;
    recordedAt: IsoDateTime;
  };
  CREATE_GEOFENCE: {
    geofenceId: string;
  };
  UPDATE_GEOFENCE: {
    geofenceId: string;
  };
  DELETE_GEOFENCE: {
    geofenceId: string;
  };
  GET_SETTINGS: {
    settings: Readonly<Record<string, JsonSettingValue>>;
  };
  SET_SETTING: {
    key: string;
  };
};

type CommandResultBase<K extends CommandType> = {
  commandId: string;
  deviceId: string;
  type: K;
  completedAt: IsoDateTime;
};

export type CommandResult<T extends CommandType = CommandType> = {
  [K in T]: CommandResultBase<K> &
    (
      | {
          status: Extract<CommandResultStatus, "SUCCESS">;
          data: CommandResultDataByType[K];
          error: null;
        }
      | {
          status: Exclude<CommandResultStatus, "SUCCESS">;
          data: null;
          error: CommandError;
        }
    );
}[T];
