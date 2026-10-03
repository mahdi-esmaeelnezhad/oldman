import type { CommandView } from "@/server/commands/command-service";
import { publishFamilyEvent } from "@/server/realtime/family-events";
import type {
  DeviceEventKind,
  DeviceEventRealtimeEvent,
  DeviceStatusRealtimeEvent,
  FamilyRealtimeEvent,
  GeofenceEventRealtimeEvent,
  RealtimeCommandSnapshot,
} from "@/types/contracts/family-realtime-event";
import type { DeviceStatus } from "@/generated/prisma/enums";

export function toRealtimeCommandSnapshot(command: CommandView): RealtimeCommandSnapshot {
  return {
    commandId: command.id,
    deviceId: command.deviceId,
    familyId: command.familyId,
    createdBy: command.createdBy,
    type: command.type,
    payload: command.payload,
    status: command.status,
    createdAt: command.createdAt,
    expiresAt: command.expiresAt,
    resultData: command.resultData,
    errorCode: command.errorCode,
    errorMessage: command.errorMessage,
    completedAt: command.completedAt,
  };
}

export function publishCommandResult(command: CommandView): void {
  publishFamilyEvent({
    type: "CommandResult",
    command: toRealtimeCommandSnapshot(command),
  });
}

export function publishDeviceStatus(input: {
  familyId: string;
  deviceId: string;
  status: DeviceStatus;
  lastSeenAt: string | null;
}): void {
  const event: DeviceStatusRealtimeEvent = {
    type: "DeviceStatus",
    familyId: input.familyId,
    deviceId: input.deviceId,
    status: input.status,
    lastSeenAt: input.lastSeenAt,
  };
  publishFamilyEvent(event);
}

export function publishGeofenceRealtimeEvent(input: {
  familyId: string;
  deviceId: string;
  geofenceId: string;
  geofenceName: string;
  eventType: "ENTERED" | "EXITED";
  occurredAt: string;
  notificationId: string | null;
  title: string | null;
}): void {
  const event: GeofenceEventRealtimeEvent = {
    type: "GeofenceEvent",
    ...input,
  };
  publishFamilyEvent(event);
}

export function publishDeviceEvent(input: {
  familyId: string;
  deviceId: string;
  kind: DeviceEventKind;
  data?: DeviceEventRealtimeEvent["data"];
}): void {
  const event: DeviceEventRealtimeEvent = {
    type: "DeviceEvent",
    familyId: input.familyId,
    deviceId: input.deviceId,
    kind: input.kind,
    at: new Date().toISOString(),
    data: input.data,
  };
  publishFamilyEvent(event);
}

export function encodeSseMessage(event: FamilyRealtimeEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
