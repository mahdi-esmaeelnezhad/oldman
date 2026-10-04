import { Prisma, type CommandStatus as DbCommandStatus, type CommandType as DbCommandType } from "@/generated/prisma/client";
import { commandTtlSeconds } from "@/config/session";
import {
  appCommandTypes,
  contactCommandTypes,
  isAppCommandType,
  settingsCommandTypes,
  type AppCommandType,
  type ContactCommandType,
  type SettingsCommandType,
} from "@/config/device-capabilities";
import { getDeviceSettingDefinition, isValidSettingValue } from "@/config/device-settings";
import { prisma } from "@/lib/prisma";
import {
  applyCreatedContact,
  applyDeletedContact,
  applyUpdatedContact,
} from "@/server/contacts/contact-service";
import { applyInstalledApp } from "@/server/apps/app-service";
import { recordAuditLog, safeCommandAuditMetadata } from "@/server/audit/audit-service";
import {
  requireAppManagementPermission,
  requireContactManagementPermission,
  requireDeviceManagePermission,
  requireDeviceViewPermission,
  requireSecurityManagementPermission,
  requireSettingsManagementPermission,
} from "@/server/auth/authorization";
import { parseDeviceCapabilities } from "@/server/devices/capabilities";
import { AppError } from "@/server/http/api-error";
import { publishCommandResult, publishDeviceEvent } from "@/server/realtime/publish";
import { applySettingValue, applySettingsSnapshot } from "@/server/settings/settings-service";
import { isCommandSupported } from "@/types/contracts/device-capability";
import type { CommandPayloadByType, CommandType, JsonSettingValue } from "@/types/contracts/command";
import type { CommandResultStatus } from "@/types/contracts/command-status";

function auditMetadataForCommand(
  type: string,
  payload: unknown,
  extras?: { status?: string; errorCode?: string | null },
) {
  const record = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
  return safeCommandAuditMetadata({
    type,
    status: extras?.status,
    errorCode: extras?.errorCode,
    packageName: typeof record.packageName === "string" ? record.packageName : undefined,
    contactId: typeof record.contactId === "string" ? record.contactId : undefined,
    settingKey: typeof record.key === "string" ? record.key : undefined,
    geofenceId: typeof record.geofenceId === "string" ? record.geofenceId : undefined,
  });
}

export type CommandView = {
  commandId: string;
  id: string;
  familyId: string;
  deviceId: string;
  createdBy: string;
  type: CommandType;
  payload: Record<string, unknown>;
  status: DbCommandStatus;
  resultData: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  expiresAt: string;
  sentAt: string | null;
  receivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

const terminalStatuses = new Set<DbCommandStatus>(["SUCCESS", "FAILED", "UNSUPPORTED", "EXPIRED", "CANCELLED"]);

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function serializeCommand(command: {
  id: string;
  familyId: string;
  deviceId: string;
  createdBy: string;
  type: DbCommandType;
  payload: Prisma.JsonValue;
  status: DbCommandStatus;
  resultData: Prisma.JsonValue | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  expiresAt: Date;
  sentAt: Date | null;
  receivedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
}): CommandView {
  return {
    commandId: command.id,
    id: command.id,
    familyId: command.familyId,
    deviceId: command.deviceId,
    createdBy: command.createdBy,
    type: command.type,
    payload: (command.payload ?? {}) as Record<string, unknown>,
    status: command.status,
    resultData: command.resultData,
    errorCode: command.errorCode,
    errorMessage: command.errorMessage,
    createdAt: command.createdAt.toISOString(),
    expiresAt: command.expiresAt.toISOString(),
    sentAt: toIso(command.sentAt),
    receivedAt: toIso(command.receivedAt),
    startedAt: toIso(command.startedAt),
    completedAt: toIso(command.completedAt),
  };
}

function emitCommand(command: CommandView): CommandView {
  publishCommandResult(command);
  return command;
}

export function publishDbCommand(command: {
  id: string;
  familyId: string;
  deviceId: string;
  createdBy: string;
  type: DbCommandType;
  payload: Prisma.JsonValue;
  status: DbCommandStatus;
  resultData: Prisma.JsonValue | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  expiresAt: Date;
  sentAt: Date | null;
  receivedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
}): CommandView {
  return emitCommand(serializeCommand(command));
}

async function expireIfNeeded(
  command: {
    id: string;
    familyId: string;
    deviceId: string;
    createdBy: string;
    type: DbCommandType;
    payload: Prisma.JsonValue;
    status: DbCommandStatus;
    resultData: Prisma.JsonValue | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: Date;
    expiresAt: Date;
    sentAt: Date | null;
    receivedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
  },
) {
  if (terminalStatuses.has(command.status) || command.expiresAt.getTime() > Date.now()) {
    return command;
  }

  const expired = await prisma.command.update({
    where: { id: command.id },
    data: {
      status: "EXPIRED",
      completedAt: new Date(),
      errorCode: "COMMAND_EXPIRED",
      errorMessage: "Command expired before the device completed it.",
    },
  });
  emitCommand(serializeCommand(expired));
  await recordAuditLog({
    familyId: expired.familyId,
    actorUserId: expired.createdBy,
    deviceId: expired.deviceId,
    commandId: expired.id,
    action: "COMMAND_EXPIRED",
    status: "FAILED",
    result: "Command expired",
    metadata: auditMetadataForCommand(expired.type, expired.payload, {
      status: expired.status,
      errorCode: expired.errorCode,
    }),
  });
  return expired;
}

export async function createAppCommand(
  userId: string,
  familyId: string,
  deviceId: string,
  type: CommandType,
  payload: CommandPayloadByType[CommandType],
): Promise<CommandView> {
  if (!isAppCommandType(type)) {
    throw new AppError(400, "VALIDATION_ERROR", "Only app management commands are allowed here.");
  }

  await requireAppManagementPermission(userId, familyId);
  const device = await prisma.device.findFirst({
    where: { id: deviceId, familyId },
    select: { id: true, familyId: true, capabilities: true },
  });

  if (!device) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }

  const capabilities = parseDeviceCapabilities(device.capabilities);
  if (!isCommandSupported(capabilities, type)) {
    throw new AppError(403, "COMMAND_UNSUPPORTED", "This device does not support that command.");
  }

  const packageName =
    "packageName" in payload && typeof payload.packageName === "string" ? payload.packageName.trim() : "";
  if (!packageName) {
    throw new AppError(400, "VALIDATION_ERROR", "packageName is required.");
  }

  if (type === "INSTALL_APP") {
    const catalog = await prisma.appCatalogEntry.findUnique({
      where: { packageName },
      select: { packageName: true },
    });
    if (!catalog) {
      throw new AppError(404, "APP_NOT_FOUND", "That application is not available to install.");
    }

    const alreadyInstalled = await prisma.deviceApp.findUnique({
      where: {
        deviceId_packageName: {
          deviceId,
          packageName,
        },
      },
      select: { id: true },
    });
    if (alreadyInstalled) {
      throw new AppError(409, "APP_ALREADY_INSTALLED", "That application is already installed.");
    }
  }

  if (type === "UNINSTALL_APP" || type === "ENABLE_APP" || type === "DISABLE_APP") {
    const installed = await prisma.deviceApp.findUnique({
      where: {
        deviceId_packageName: {
          deviceId,
          packageName,
        },
      },
      select: {
        canUninstall: true,
        canDisable: true,
        isSystem: true,
        state: true,
      },
    });

    if (!installed) {
      throw new AppError(404, "APP_NOT_FOUND", "That application is not installed on the device.");
    }

    if (type === "UNINSTALL_APP" && (!installed.canUninstall || installed.isSystem)) {
      throw new AppError(
        400,
        "APP_UNINSTALL_UNSUPPORTED",
        "That application cannot be uninstalled on this device.",
      );
    }

    if ((type === "ENABLE_APP" || type === "DISABLE_APP") && !installed.canDisable) {
      throw new AppError(400, "APP_DISABLE_UNSUPPORTED", "That application cannot change enable state.");
    }
  }

  return createPendingCommand(userId, familyId, deviceId, type, payload);
}

export async function createContactCommand(
  userId: string,
  familyId: string,
  deviceId: string,
  type: ContactCommandType,
  payload: CommandPayloadByType[ContactCommandType],
): Promise<CommandView> {
  await requireContactManagementPermission(userId, familyId);
  const device = await prisma.device.findFirst({
    where: { id: deviceId, familyId },
    select: { id: true, capabilities: true },
  });
  if (!device) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }

  const capabilities = parseDeviceCapabilities(device.capabilities);
  if (!isCommandSupported(capabilities, type)) {
    throw new AppError(403, "COMMAND_UNSUPPORTED", "This device does not support that command.");
  }

  if (type === "UPDATE_CONTACT" || type === "DELETE_CONTACT") {
    const contactId = "contactId" in payload ? payload.contactId : "";
    const existing = await prisma.deviceContact.findUnique({
      where: {
        deviceId_contactId: {
          deviceId,
          contactId,
        },
      },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError(404, "CONTACT_NOT_FOUND", "Contact was not found.");
    }
  }

  return createPendingCommand(userId, familyId, deviceId, type, payload);
}

export async function createSettingsCommand(
  userId: string,
  familyId: string,
  deviceId: string,
  type: SettingsCommandType,
  payload: CommandPayloadByType[SettingsCommandType],
): Promise<CommandView> {
  if (type === "SET_SETTING") {
    const definition = getDeviceSettingDefinition(payload.key);
    if (!definition || !definition.writable || !isValidSettingValue(definition, payload.value)) {
      throw new AppError(400, "SETTING_UNSUPPORTED", "That setting cannot be changed on this device.");
    }
    if (definition.section === "SECURITY") {
      await requireSecurityManagementPermission(userId, familyId);
    } else {
      await requireSettingsManagementPermission(userId, familyId);
    }
  } else {
    await requireSettingsManagementPermission(userId, familyId);
  }

  const device = await prisma.device.findFirst({
    where: { id: deviceId, familyId },
    select: { id: true, capabilities: true },
  });
  if (!device) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }

  const capabilities = parseDeviceCapabilities(device.capabilities);
  if (!isCommandSupported(capabilities, type)) {
    throw new AppError(403, "COMMAND_UNSUPPORTED", "This device does not support that command.");
  }

  if (type === "SET_SETTING") {
    const existing = await prisma.deviceSetting.findUnique({
      where: {
        deviceId_key: {
          deviceId,
          key: payload.key,
        },
      },
      select: { writable: true },
    });
    if (!existing || !existing.writable) {
      throw new AppError(400, "SETTING_UNSUPPORTED", "That setting is not available on this device.");
    }
  }

  return createPendingCommand(userId, familyId, deviceId, type, payload);
}

async function createPendingCommand(
  userId: string,
  familyId: string,
  deviceId: string,
  type: AppCommandType | ContactCommandType | SettingsCommandType,
  payload: CommandPayloadByType[CommandType],
): Promise<CommandView> {
  const command = await prisma.command.create({
    data: {
      familyId,
      deviceId,
      createdBy: userId,
      type: type as DbCommandType,
      payload: payload as Prisma.InputJsonValue,
      status: "PENDING",
      expiresAt: new Date(Date.now() + commandTtlSeconds * 1000),
    },
  });

  const view = emitCommand(serializeCommand(command));
  await recordAuditLog({
    familyId,
    actorUserId: userId,
    deviceId,
    commandId: command.id,
    action: "COMMAND_CREATED",
    status: "PENDING",
    result: "Command queued for device",
    metadata: auditMetadataForCommand(type, payload, { status: "PENDING" }),
  });
  return view;
}

export async function getCommandForUser(
  userId: string,
  familyId: string,
  deviceId: string,
  commandId: string,
): Promise<CommandView> {
  await requireDeviceViewPermission(userId, familyId);
  const command = await prisma.command.findFirst({
    where: {
      id: commandId,
      familyId,
      deviceId,
    },
  });

  if (!command) {
    throw new AppError(404, "COMMAND_NOT_FOUND", "Command was not found.");
  }

  return serializeCommand(await expireIfNeeded(command));
}

export async function listRecentAppCommands(
  userId: string,
  familyId: string,
  deviceId: string,
): Promise<CommandView[]> {
  return listRecentCommandsByTypes(userId, familyId, deviceId, appCommandTypes);
}

export async function listRecentContactCommands(
  userId: string,
  familyId: string,
  deviceId: string,
): Promise<CommandView[]> {
  return listRecentCommandsByTypes(userId, familyId, deviceId, contactCommandTypes);
}

export async function listRecentSettingsCommands(
  userId: string,
  familyId: string,
  deviceId: string,
): Promise<CommandView[]> {
  return listRecentCommandsByTypes(userId, familyId, deviceId, settingsCommandTypes);
}

export async function listRecentDeviceCommands(
  userId: string,
  familyId: string,
  deviceId: string,
): Promise<CommandView[]> {
  await requireDeviceViewPermission(userId, familyId);
  const device = await prisma.device.findFirst({
    where: { id: deviceId, familyId },
    select: { id: true },
  });
  if (!device) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }

  const commands = await prisma.command.findMany({
    where: { deviceId, familyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Promise.all(commands.map(async (command) => serializeCommand(await expireIfNeeded(command))));
}

export async function cancelCommandForUser(
  userId: string,
  familyId: string,
  deviceId: string,
  commandId: string,
): Promise<CommandView> {
  await requireDeviceManagePermission(userId, familyId);

  const command = await prisma.command.findFirst({
    where: { id: commandId, familyId, deviceId },
  });
  if (!command) {
    throw new AppError(404, "COMMAND_NOT_FOUND", "Command was not found.");
  }

  const current = await expireIfNeeded(command);
  if (terminalStatuses.has(current.status)) {
    throw new AppError(409, "COMMAND_ALREADY_FINISHED", "Command already finished.");
  }

  if (current.status === "EXECUTING") {
    throw new AppError(409, "COMMAND_NOT_CANCELLABLE", "Executing commands cannot be cancelled.");
  }

  const cancelled = await prisma.command.update({
    where: { id: commandId },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
      errorCode: "COMMAND_CANCELLED",
      errorMessage: "Command was cancelled by a caregiver.",
    },
  });

  const view = emitCommand(serializeCommand(cancelled));
  await recordAuditLog({
    familyId,
    actorUserId: userId,
    deviceId,
    commandId: cancelled.id,
    action: "COMMAND_CANCELLED",
    status: "SUCCESS",
    result: "Command cancelled",
    metadata: auditMetadataForCommand(cancelled.type, cancelled.payload, {
      status: cancelled.status,
      errorCode: cancelled.errorCode,
    }),
  });
  return view;
}

async function listRecentCommandsByTypes(
  userId: string,
  familyId: string,
  deviceId: string,
  types: readonly CommandType[],
): Promise<CommandView[]> {
  await requireDeviceViewPermission(userId, familyId);
  const device = await prisma.device.findFirst({
    where: { id: deviceId, familyId },
    select: { id: true },
  });
  if (!device) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }

  const commands = await prisma.command.findMany({
    where: {
      deviceId,
      familyId,
      type: { in: [...types] as DbCommandType[] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return Promise.all(commands.map(async (command) => serializeCommand(await expireIfNeeded(command))));
}

export async function listPendingCommandsForDevice(deviceId: string): Promise<CommandView[]> {
  const now = new Date();
  await prisma.command.updateMany({
    where: {
      deviceId,
      status: { in: ["PENDING", "SENT", "RECEIVED", "EXECUTING"] },
      expiresAt: { lte: now },
    },
    data: {
      status: "EXPIRED",
      completedAt: now,
      errorCode: "COMMAND_EXPIRED",
      errorMessage: "Command expired before the device completed it.",
    },
  });

  const pending = await prisma.command.findMany({
    where: {
      deviceId,
      status: "PENDING",
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const sentAt = new Date();
  const updated = await Promise.all(
    pending.map((command) =>
      prisma.command.update({
        where: { id: command.id },
        data: {
          status: "SENT",
          sentAt,
        },
      }),
    ),
  );

  return updated.map((command) => emitCommand(serializeCommand(command)));
}

export async function updateCommandProgressForDevice(
  deviceId: string,
  commandId: string,
  status: Extract<DbCommandStatus, "RECEIVED" | "EXECUTING">,
): Promise<CommandView> {
  const command = await prisma.command.findFirst({
    where: { id: commandId, deviceId },
  });

  if (!command) {
    throw new AppError(404, "COMMAND_NOT_FOUND", "Command was not found.");
  }

  const current = await expireIfNeeded(command);
  if (terminalStatuses.has(current.status)) {
    throw new AppError(409, "COMMAND_ALREADY_FINISHED", "Command already finished.");
  }

  const updated = await prisma.command.update({
    where: { id: commandId },
    data: {
      status,
      receivedAt: status === "RECEIVED" ? new Date() : current.receivedAt,
      startedAt: status === "EXECUTING" ? new Date() : current.startedAt,
    },
  });

  return emitCommand(serializeCommand(updated));
}

export async function completeCommandForDevice(
  deviceId: string,
  commandId: string,
  input: {
    status: CommandResultStatus;
    data?: Record<string, unknown> | null;
    error?: { code: string; message: string } | null;
  },
): Promise<CommandView> {
  const command = await prisma.command.findFirst({
    where: { id: commandId, deviceId },
  });

  if (!command) {
    throw new AppError(404, "COMMAND_NOT_FOUND", "Command was not found.");
  }

  const current = await expireIfNeeded(command);
  if (terminalStatuses.has(current.status)) {
    throw new AppError(409, "COMMAND_ALREADY_FINISHED", "Command already finished.");
  }

  return prisma.$transaction(async (tx) => {
    const completedAt = new Date();
    const updated = await tx.command.update({
      where: { id: commandId },
      data: {
        status: input.status,
        resultData: input.status === "SUCCESS" ? ((input.data ?? {}) as Prisma.InputJsonValue) : Prisma.JsonNull,
        errorCode: input.status === "SUCCESS" ? null : (input.error?.code ?? "COMMAND_FAILED"),
        errorMessage:
          input.status === "SUCCESS" ? null : (input.error?.message ?? "Command failed on the device."),
        completedAt,
        startedAt: current.startedAt ?? completedAt,
      },
    });

    if (input.status === "SUCCESS") {
      switch (current.type) {
        case "INSTALL_APP":
        case "UNINSTALL_APP":
        case "ENABLE_APP":
        case "DISABLE_APP": {
          const payload = current.payload as { packageName?: string };
          const packageName = payload.packageName;
          if (!packageName) {
            throw new AppError(400, "VALIDATION_ERROR", "Command payload is invalid.");
          }

          if (current.type === "INSTALL_APP") {
            const catalog = await tx.appCatalogEntry.findUnique({
              where: { packageName },
            });
            await applyInstalledApp(tx, deviceId, {
              packageName,
              label: catalog?.label ?? packageName,
              versionName: catalog?.versionName ?? null,
              iconUrl: catalog?.iconUrl ?? null,
              state: "ENABLED",
              isSystem: false,
              canUninstall: true,
              canDisable: true,
            });
            break;
          }

          if (current.type === "UNINSTALL_APP") {
            await tx.deviceApp.deleteMany({
              where: { deviceId, packageName },
            });
            break;
          }

          await tx.deviceApp.updateMany({
            where: { deviceId, packageName },
            data: { state: current.type === "ENABLE_APP" ? "ENABLED" : "DISABLED" },
          });
          break;
        }
        case "CREATE_CONTACT": {
          const payload = current.payload as CommandPayloadByType["CREATE_CONTACT"];
          const contactId =
            input.data && typeof input.data.contactId === "string" ? input.data.contactId : null;
          if (!contactId) {
            throw new AppError(400, "VALIDATION_ERROR", "CREATE_CONTACT result requires contactId.");
          }
          await applyCreatedContact(tx, deviceId, {
            contactId,
            displayName: payload.displayName,
            phoneNumber: payload.phoneNumber,
          });
          break;
        }
        case "UPDATE_CONTACT": {
          const payload = current.payload as CommandPayloadByType["UPDATE_CONTACT"];
          await applyUpdatedContact(tx, deviceId, payload);
          break;
        }
        case "DELETE_CONTACT": {
          const payload = current.payload as CommandPayloadByType["DELETE_CONTACT"];
          await applyDeletedContact(tx, deviceId, payload.contactId);
          break;
        }
        case "GET_SETTINGS": {
          const settings =
            input.data &&
            typeof input.data.settings === "object" &&
            input.data.settings !== null &&
            !Array.isArray(input.data.settings)
              ? (input.data.settings as Record<string, JsonSettingValue>)
              : null;
          if (!settings) {
            throw new AppError(400, "VALIDATION_ERROR", "GET_SETTINGS result requires settings.");
          }
          await applySettingsSnapshot(tx, deviceId, settings);
          break;
        }
        case "SET_SETTING": {
          const payload = current.payload as CommandPayloadByType["SET_SETTING"];
          await applySettingValue(tx, deviceId, payload.key, payload.value);
          break;
        }
        default:
          break;
      }
    }

    return emitCommand(serializeCommand(updated));
  }).then(async (command) => {
    if (input.status === "SUCCESS") {
      const kind =
        current.type === "CREATE_CONTACT" ||
        current.type === "UPDATE_CONTACT" ||
        current.type === "DELETE_CONTACT"
          ? "CONTACT_CHANGED"
          : current.type === "GET_SETTINGS" || current.type === "SET_SETTING"
            ? "SETTING_CHANGED"
            : current.type === "INSTALL_APP" ||
                current.type === "UNINSTALL_APP" ||
                current.type === "ENABLE_APP" ||
                current.type === "DISABLE_APP"
              ? "APP_CHANGED"
              : null;
      if (kind) {
        publishDeviceEvent({
          familyId: command.familyId,
          deviceId: command.deviceId,
          kind,
        });
      }
    }

    await recordAuditLog({
      familyId: command.familyId,
      actorUserId: command.createdBy,
      deviceId: command.deviceId,
      commandId: command.id,
      action: "COMMAND_COMPLETED",
      status: input.status === "SUCCESS" ? "SUCCESS" : "FAILED",
      result: input.status === "SUCCESS" ? "Command completed" : (input.error?.code ?? "COMMAND_FAILED"),
      metadata: auditMetadataForCommand(command.type, current.payload, {
        status: command.status,
        errorCode: command.errorCode,
      }),
    });

    return command;
  });
}
