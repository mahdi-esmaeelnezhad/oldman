import type { CommandStatus } from "@/types/contracts/command-status";
import type { CommandType, IsoDateTime, JsonSettingValue } from "@/types/contracts/command";
import type { DeviceStatus } from "@/generated/prisma/enums";

export const familyRealtimeEventTypes = [
  "CommandResult",
  "DeviceStatus",
  "GeofenceEvent",
  "DeviceEvent",
] as const;

export type FamilyRealtimeEventType = (typeof familyRealtimeEventTypes)[number];

export type RealtimeCommandSnapshot = {
  commandId: string;
  deviceId: string;
  familyId: string;
  createdBy: string;
  type: CommandType;
  payload: Record<string, unknown>;
  status: CommandStatus;
  createdAt: IsoDateTime;
  expiresAt: IsoDateTime;
  resultData?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
  completedAt?: IsoDateTime | null;
};

export type CommandResultRealtimeEvent = {
  type: "CommandResult";
  command: RealtimeCommandSnapshot;
};

export type DeviceStatusRealtimeEvent = {
  type: "DeviceStatus";
  deviceId: string;
  familyId: string;
  status: DeviceStatus;
  lastSeenAt: IsoDateTime | null;
};

export type GeofenceEventRealtimeEvent = {
  type: "GeofenceEvent";
  familyId: string;
  deviceId: string;
  geofenceId: string;
  geofenceName: string;
  eventType: "ENTERED" | "EXITED";
  occurredAt: IsoDateTime;
  notificationId: string | null;
  title: string | null;
};

export type DeviceEventKind =
  | "LOCATION_UPDATED"
  | "CONTACT_CHANGED"
  | "SETTING_CHANGED"
  | "APP_CHANGED"
  | "DEVICE_SEEN";

export type DeviceEventRealtimeEvent = {
  type: "DeviceEvent";
  familyId: string;
  deviceId: string;
  kind: DeviceEventKind;
  at: IsoDateTime;
  data?: Record<string, JsonSettingValue | string | number | boolean | null>;
};

export type FamilyRealtimeEvent =
  | CommandResultRealtimeEvent
  | DeviceStatusRealtimeEvent
  | GeofenceEventRealtimeEvent
  | DeviceEventRealtimeEvent;
