import { commandTtlSeconds, geofenceNotificationDedupeSeconds } from "@/config/session";
import { prisma } from "@/lib/prisma";
import {
  canManageGeofences,
  requireFamilyMember,
  requireGeofenceManagementPermission,
  requireLocationViewPermission,
} from "@/server/auth/authorization";
import { recordAuditLog, safeCommandAuditMetadata } from "@/server/audit/audit-service";
import { publishDbCommand } from "@/server/commands/command-service";
import { AppError } from "@/server/http/api-error";
import {
  publishDeviceEvent,
  publishDeviceStatus,
  publishGeofenceRealtimeEvent,
} from "@/server/realtime/publish";
import type { GeofenceEventType, LocationPermissionStatus } from "@/generated/prisma/enums";

export type DeviceLocationView = {
  deviceId: string;
  familyId: string;
  deviceName: string;
  latitude: number | null;
  longitude: number | null;
  lastLocationAt: string | null;
  locationPermission: LocationPermissionStatus;
  locationServiceEnabled: boolean | null;
  available: boolean;
  canManage: boolean;
};

export type GeofenceView = {
  id: string;
  familyId: string;
  deviceId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  enabled: boolean;
  lastEventType: GeofenceEventType | null;
  lastEventAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FamilyNotificationView = {
  id: string;
  familyId: string;
  deviceId: string | null;
  geofenceId: string | null;
  type: "GEOFENCE_ENTERED" | "GEOFENCE_EXITED";
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

async function requireDeviceInFamily(familyId: string, deviceId: string) {
  const device = await prisma.device.findFirst({
    where: { id: deviceId, familyId },
    select: {
      id: true,
      familyId: true,
      name: true,
      lastLatitude: true,
      lastLongitude: true,
      lastLocationAt: true,
      locationPermission: true,
      locationServiceEnabled: true,
    },
  });

  if (!device) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }

  return device;
}

function serializeGeofence(geofence: {
  id: string;
  familyId: string;
  deviceId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  enabled: boolean;
  lastEventType: GeofenceEventType | null;
  lastEventAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): GeofenceView {
  return {
    id: geofence.id,
    familyId: geofence.familyId,
    deviceId: geofence.deviceId,
    name: geofence.name,
    latitude: geofence.latitude,
    longitude: geofence.longitude,
    radiusMeters: geofence.radiusMeters,
    enabled: geofence.enabled,
    lastEventType: geofence.lastEventType,
    lastEventAt: geofence.lastEventAt ? geofence.lastEventAt.toISOString() : null,
    createdAt: geofence.createdAt.toISOString(),
    updatedAt: geofence.updatedAt.toISOString(),
  };
}

export async function getDeviceLocation(
  userId: string,
  familyId: string,
  deviceId: string,
): Promise<DeviceLocationView> {
  const membership = await requireLocationViewPermission(userId, familyId);
  const device = await requireDeviceInFamily(familyId, deviceId);
  const available =
    device.lastLatitude !== null &&
    device.lastLongitude !== null &&
    device.locationPermission === "GRANTED" &&
    device.locationServiceEnabled !== false;

  return {
    deviceId: device.id,
    familyId: device.familyId,
    deviceName: device.name,
    latitude: device.lastLatitude,
    longitude: device.lastLongitude,
    lastLocationAt: device.lastLocationAt ? device.lastLocationAt.toISOString() : null,
    locationPermission: device.locationPermission,
    locationServiceEnabled: device.locationServiceEnabled,
    available,
    canManage: canManageGeofences(membership.role),
  };
}

export async function listGeofencesForDevice(
  userId: string,
  familyId: string,
  deviceId: string,
): Promise<GeofenceView[]> {
  await requireLocationViewPermission(userId, familyId);
  await requireDeviceInFamily(familyId, deviceId);
  const geofences = await prisma.geofence.findMany({
    where: { familyId, deviceId },
    orderBy: { createdAt: "asc" },
  });
  return geofences.map(serializeGeofence);
}

export async function createGeofence(
  userId: string,
  familyId: string,
  deviceId: string,
  input: {
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    enabled?: boolean;
  },
): Promise<GeofenceView> {
  await requireGeofenceManagementPermission(userId, familyId);
  await requireDeviceInFamily(familyId, deviceId);

  const enabled = input.enabled ?? true;
  const geofence = await prisma.$transaction(async (tx) => {
    const created = await tx.geofence.create({
      data: {
        familyId,
        deviceId,
        createdBy: userId,
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMeters: input.radiusMeters,
        enabled,
      },
    });

    const command = await tx.command.create({
      data: {
        familyId,
        deviceId,
        createdBy: userId,
        type: "CREATE_GEOFENCE",
        payload: {
          geofenceId: created.id,
          name: created.name,
          latitude: created.latitude,
          longitude: created.longitude,
          radiusMeters: created.radiusMeters,
        },
        status: "PENDING",
        expiresAt: new Date(Date.now() + commandTtlSeconds * 1000),
      },
    });

    return { created, command };
  });

  publishDbCommand(geofence.command);
  await recordAuditLog({
    familyId,
    actorUserId: userId,
    deviceId,
    commandId: geofence.command.id,
    action: "GEOFENCE_CREATED",
    status: "SUCCESS",
    result: "Geofence created",
    metadata: safeCommandAuditMetadata({
      type: "CREATE_GEOFENCE",
      status: "PENDING",
      geofenceId: geofence.created.id,
    }),
  });
  return serializeGeofence(geofence.created);
}

export async function updateGeofence(
  userId: string,
  familyId: string,
  deviceId: string,
  geofenceId: string,
  input: {
    name?: string;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    enabled?: boolean;
  },
): Promise<GeofenceView> {
  await requireGeofenceManagementPermission(userId, familyId);
  await requireDeviceInFamily(familyId, deviceId);

  const existing = await prisma.geofence.findFirst({
    where: { id: geofenceId, familyId, deviceId },
  });
  if (!existing) {
    throw new AppError(404, "GEOFENCE_NOT_FOUND", "Geofence was not found.");
  }

  const geofence = await prisma.$transaction(async (tx) => {
    const updated = await tx.geofence.update({
      where: { id: geofenceId },
      data: {
        name: input.name ?? existing.name,
        latitude: input.latitude ?? existing.latitude,
        longitude: input.longitude ?? existing.longitude,
        radiusMeters: input.radiusMeters ?? existing.radiusMeters,
        enabled: input.enabled ?? existing.enabled,
      },
    });

    const command = await tx.command.create({
      data: {
        familyId,
        deviceId,
        createdBy: userId,
        type: "UPDATE_GEOFENCE",
        payload: {
          geofenceId: updated.id,
          name: updated.name,
          latitude: updated.latitude,
          longitude: updated.longitude,
          radiusMeters: updated.radiusMeters,
          enabled: updated.enabled,
        },
        status: "PENDING",
        expiresAt: new Date(Date.now() + commandTtlSeconds * 1000),
      },
    });

    return { updated, command };
  });

  publishDbCommand(geofence.command);
  await recordAuditLog({
    familyId,
    actorUserId: userId,
    deviceId,
    commandId: geofence.command.id,
    action: "GEOFENCE_UPDATED",
    status: "SUCCESS",
    result: "Geofence updated",
    metadata: safeCommandAuditMetadata({
      type: "UPDATE_GEOFENCE",
      status: "PENDING",
      geofenceId: geofence.updated.id,
    }),
  });
  return serializeGeofence(geofence.updated);
}

export async function deleteGeofence(
  userId: string,
  familyId: string,
  deviceId: string,
  geofenceId: string,
): Promise<void> {
  await requireGeofenceManagementPermission(userId, familyId);
  await requireDeviceInFamily(familyId, deviceId);

  const existing = await prisma.geofence.findFirst({
    where: { id: geofenceId, familyId, deviceId },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError(404, "GEOFENCE_NOT_FOUND", "Geofence was not found.");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.geofence.delete({ where: { id: geofenceId } });
    const command = await tx.command.create({
      data: {
        familyId,
        deviceId,
        createdBy: userId,
        type: "DELETE_GEOFENCE",
        payload: { geofenceId },
        status: "PENDING",
        expiresAt: new Date(Date.now() + commandTtlSeconds * 1000),
      },
    });
    return command;
  });
  publishDbCommand(result);
  await recordAuditLog({
    familyId,
    actorUserId: userId,
    deviceId,
    commandId: result.id,
    action: "GEOFENCE_DELETED",
    status: "SUCCESS",
    result: "Geofence deleted",
    metadata: safeCommandAuditMetadata({
      type: "DELETE_GEOFENCE",
      status: "PENDING",
      geofenceId,
    }),
  });
}

export async function updateDeviceLocationFromAgent(
  deviceId: string,
  input: {
    latitude: number;
    longitude: number;
    recordedAt?: string;
    locationPermission?: LocationPermissionStatus;
    locationServiceEnabled?: boolean;
  },
): Promise<void> {
  const device = await prisma.device.update({
    where: { id: deviceId },
    data: {
      lastLatitude: input.latitude,
      lastLongitude: input.longitude,
      lastLocationAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
      locationPermission: input.locationPermission ?? "GRANTED",
      locationServiceEnabled: input.locationServiceEnabled ?? true,
      lastSeenAt: new Date(),
      status: "ONLINE",
    },
    select: {
      id: true,
      familyId: true,
      status: true,
      lastSeenAt: true,
    },
  });

  publishDeviceStatus({
    familyId: device.familyId,
    deviceId: device.id,
    status: device.status,
    lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
  });
  publishDeviceEvent({
    familyId: device.familyId,
    deviceId: device.id,
    kind: "LOCATION_UPDATED",
    data: {
      latitude: input.latitude,
      longitude: input.longitude,
    },
  });
}

export async function recordGeofenceEventFromAgent(
  deviceId: string,
  familyId: string,
  input: {
    geofenceId: string;
    type: GeofenceEventType;
    occurredAt?: string;
  },
): Promise<{ accepted: boolean; notificationId: string | null }> {
  const geofence = await prisma.geofence.findFirst({
    where: {
      id: input.geofenceId,
      deviceId,
      familyId,
      enabled: true,
    },
    include: {
      device: {
        select: { name: true },
      },
    },
  });

  if (!geofence) {
    throw new AppError(404, "GEOFENCE_NOT_FOUND", "Geofence was not found.");
  }

  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  const dedupeSince = new Date(occurredAt.getTime() - geofenceNotificationDedupeSeconds * 1000);

  if (
    geofence.lastEventType === input.type &&
    geofence.lastEventAt &&
    geofence.lastEventAt.getTime() >= dedupeSince.getTime()
  ) {
    return { accepted: false, notificationId: null };
  }

  const recentDuplicate = await prisma.geofenceEvent.findFirst({
    where: {
      geofenceId: geofence.id,
      type: input.type,
      occurredAt: { gte: dedupeSince },
    },
    select: { id: true },
  });
  if (recentDuplicate) {
    return { accepted: false, notificationId: null };
  }

  const title =
    input.type === "ENTERED"
      ? `${geofence.device.name} به ${geofence.name} رسید`
      : `${geofence.device.name} از ${geofence.name} خارج شد`;
  const body = title;
  const notificationType = input.type === "ENTERED" ? "GEOFENCE_ENTERED" : "GEOFENCE_EXITED";

  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.geofenceEvent.create({
      data: {
        familyId,
        deviceId,
        geofenceId: geofence.id,
        type: input.type,
        occurredAt,
      },
    });

    await tx.geofence.update({
      where: { id: geofence.id },
      data: {
        lastEventType: input.type,
        lastEventAt: occurredAt,
      },
    });

    const notification = await tx.familyNotification.create({
      data: {
        familyId,
        deviceId,
        geofenceId: geofence.id,
        geofenceEventId: event.id,
        type: notificationType,
        title,
        body,
      },
    });

    return notification.id;
  });

  publishGeofenceRealtimeEvent({
    familyId,
    deviceId,
    geofenceId: geofence.id,
    geofenceName: geofence.name,
    eventType: input.type,
    occurredAt: occurredAt.toISOString(),
    notificationId: result,
    title,
  });

  return { accepted: true, notificationId: result };
}

export async function listFamilyNotifications(
  userId: string,
  familyId: string,
): Promise<FamilyNotificationView[]> {
  await requireFamilyMember(userId, familyId);
  const notifications = await prisma.familyNotification.findMany({
    where: { familyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return notifications.map((notification) => ({
    id: notification.id,
    familyId: notification.familyId,
    deviceId: notification.deviceId,
    geofenceId: notification.geofenceId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
  }));
}

export async function markFamilyNotificationRead(
  userId: string,
  familyId: string,
  notificationId: string,
): Promise<FamilyNotificationView> {
  await requireFamilyMember(userId, familyId);
  const existing = await prisma.familyNotification.findFirst({
    where: { id: notificationId, familyId },
  });
  if (!existing) {
    throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification was not found.");
  }

  const notification = await prisma.familyNotification.update({
    where: { id: notificationId },
    data: { readAt: existing.readAt ?? new Date() },
  });

  return {
    id: notification.id,
    familyId: notification.familyId,
    deviceId: notification.deviceId,
    geofenceId: notification.geofenceId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
  };
}
