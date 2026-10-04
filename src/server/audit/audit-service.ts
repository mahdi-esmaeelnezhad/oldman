import type { AuditAction, AuditStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDeviceViewPermission } from "@/server/auth/authorization";
import { AppError } from "@/server/http/api-error";

const SENSITIVE_KEY_PATTERN =
  /(password|passwd|pwd|token|secret|credential|authorization|cookie|session|api[_-]?key|private[_-]?key|hash)/i;

const BLOCKED_METADATA_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "secret",
  "credential",
  "deviceCredential",
  "authorization",
  "cookie",
  "payload",
  "resultData",
  "phoneNumber",
  "value",
]);

export type AuditLogView = {
  id: string;
  familyId: string;
  actorUserId: string | null;
  deviceId: string | null;
  commandId: string | null;
  action: AuditAction;
  result: string | null;
  status: AuditStatus;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type RecordAuditInput = {
  familyId: string;
  actorUserId?: string | null;
  deviceId?: string | null;
  commandId?: string | null;
  action: AuditAction;
  result?: string | null;
  status: AuditStatus;
  metadata?: Record<string, unknown> | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeAuditValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[truncated]";
  }
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeAuditValue(item, depth + 1));
  }
  if (!isPlainObject(value)) {
    return undefined;
  }

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (BLOCKED_METADATA_KEYS.has(key) || SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }
    const sanitized = sanitizeAuditValue(nested, depth + 1);
    if (sanitized !== undefined) {
      output[key] = sanitized;
    }
  }
  return output;
}

export function sanitizeAuditMetadata(
  metadata?: Record<string, unknown> | null,
): Prisma.InputJsonValue | undefined {
  if (!metadata) {
    return undefined;
  }
  const sanitized = sanitizeAuditValue(metadata);
  if (!isPlainObject(sanitized) || Object.keys(sanitized).length === 0) {
    return undefined;
  }
  return sanitized as Prisma.InputJsonValue;
}

export async function recordAuditLog(input: RecordAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        familyId: input.familyId,
        actorUserId: input.actorUserId ?? null,
        deviceId: input.deviceId ?? null,
        commandId: input.commandId ?? null,
        action: input.action,
        result: input.result ?? null,
        status: input.status,
        metadata: sanitizeAuditMetadata(input.metadata),
      },
    });
  } catch (error) {
    // Audit must never break device management flows.
    console.error("Failed to record audit log", {
      action: input.action,
      familyId: input.familyId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export function safeCommandAuditMetadata(input: {
  type: string;
  status?: string;
  errorCode?: string | null;
  packageName?: string;
  contactId?: string;
  settingKey?: string;
  geofenceId?: string;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    commandType: input.type,
  };
  if (input.status) {
    metadata.commandStatus = input.status;
  }
  if (input.errorCode) {
    metadata.errorCode = input.errorCode;
  }
  if (input.packageName) {
    metadata.packageName = input.packageName;
  }
  if (input.contactId) {
    metadata.contactId = input.contactId;
  }
  if (input.settingKey) {
    metadata.settingKey = input.settingKey;
  }
  if (input.geofenceId) {
    metadata.geofenceId = input.geofenceId;
  }
  return metadata;
}

function serializeAuditLog(row: {
  id: string;
  familyId: string;
  actorUserId: string | null;
  deviceId: string | null;
  commandId: string | null;
  action: AuditAction;
  result: string | null;
  status: AuditStatus;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}): AuditLogView {
  return {
    id: row.id,
    familyId: row.familyId,
    actorUserId: row.actorUserId,
    deviceId: row.deviceId,
    commandId: row.commandId,
    action: row.action,
    result: row.result,
    status: row.status,
    metadata: isPlainObject(row.metadata) ? (row.metadata as Record<string, unknown>) : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listFamilyAuditLogs(
  userId: string,
  familyId: string,
  options?: { deviceId?: string; take?: number },
): Promise<AuditLogView[]> {
  await requireDeviceViewPermission(userId, familyId);

  if (options?.deviceId) {
    const device = await prisma.device.findFirst({
      where: { id: options.deviceId, familyId },
      select: { id: true },
    });
    if (!device) {
      throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
    }
  }

  const rows = await prisma.auditLog.findMany({
    where: {
      familyId,
      ...(options?.deviceId ? { deviceId: options.deviceId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(options?.take ?? 50, 1), 100),
  });

  return rows.map(serializeAuditLog);
}
