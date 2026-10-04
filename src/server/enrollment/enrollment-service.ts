import QRCode from "qrcode";
import { demoDeviceCapabilities } from "@/config/device-capabilities";
import { enrollmentTtlSeconds } from "@/config/session";
import type { EnrollmentQrPayload } from "@/types/contracts/enrollment";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit/audit-service";
import { requireEnrollmentPermission } from "@/server/auth/authorization";
import { createSecretToken, hashSecret } from "@/server/auth/secrets";
import { AppError } from "@/server/http/api-error";

export type EnrollmentSessionView = {
  expiresAt: string;
  qrDataUrl: string;
};

export type EnrolledDeviceView = {
  id: string;
  familyId: string;
  name: string;
  platform: "ANDROID";
  status: "PENDING";
  deviceCredential: string;
};

type RedeemInput = {
  token: string;
  deviceIdentifier: string;
  name: string;
  manufacturer?: string;
  model?: string;
  androidVersion?: string;
  androidSdk?: number;
  appVersion?: string;
};

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function createEnrollmentSession(userId: string, familyId: string): Promise<EnrollmentSessionView> {
  await requireEnrollmentPermission(userId, familyId);
  const token = createSecretToken();
  const expiresAt = new Date(Date.now() + enrollmentTtlSeconds * 1000);
  await prisma.enrollmentToken.create({
    data: {
      familyId,
      createdBy: userId,
      tokenHash: hashSecret(token),
      expiresAt,
    },
  });

  const payload: EnrollmentQrPayload = {
    v: 1,
    token,
  };
  const qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
    margin: 1,
    width: 280,
  });

  await recordAuditLog({
    familyId,
    actorUserId: userId,
    action: "ENROLLMENT_CREATED",
    status: "SUCCESS",
    result: "Enrollment session created",
    metadata: {
      expiresAt: expiresAt.toISOString(),
    },
  });

  return {
    expiresAt: expiresAt.toISOString(),
    qrDataUrl,
  };
}

export async function redeemEnrollmentToken(input: RedeemInput): Promise<EnrolledDeviceView> {
  const tokenHash = hashSecret(input.token);
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      const claimed = await tx.enrollmentToken.updateMany({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          usedAt: now,
        },
      });

      if (claimed.count !== 1) {
        throw new AppError(400, "ENROLLMENT_TOKEN_INVALID", "Enrollment token is invalid.");
      }

      const enrollment = await tx.enrollmentToken.findUnique({
        where: { tokenHash },
        select: { id: true, familyId: true, createdBy: true },
      });

      if (!enrollment) {
        throw new AppError(400, "ENROLLMENT_TOKEN_INVALID", "Enrollment token is invalid.");
      }

      const deviceCredential = createSecretToken();
      const device = await tx.device.create({
        data: {
          familyId: enrollment.familyId,
          deviceIdentifier: input.deviceIdentifier,
          name: input.name,
          platform: "ANDROID",
          status: "PENDING",
          manufacturer: input.manufacturer,
          model: input.model,
          androidVersion: input.androidVersion,
          androidSdk: input.androidSdk,
          appVersion: input.appVersion,
          credentialHash: hashSecret(deviceCredential),
          capabilities: demoDeviceCapabilities,
        },
        select: {
          id: true,
          familyId: true,
          name: true,
        },
      });

      await tx.enrollmentToken.update({
        where: { id: enrollment.id },
        data: { deviceId: device.id },
      });

      return {
        id: device.id,
        familyId: device.familyId,
        name: device.name,
        platform: "ANDROID" as const,
        status: "PENDING" as const,
        deviceCredential,
        actorUserId: enrollment.createdBy,
      };
    }).then(async (enrolled) => {
      await recordAuditLog({
        familyId: enrolled.familyId,
        actorUserId: enrolled.actorUserId,
        deviceId: enrolled.id,
        action: "DEVICE_ENROLLED",
        status: "SUCCESS",
        result: "Device enrolled",
        metadata: {
          deviceName: enrolled.name,
          platform: enrolled.platform,
        },
      });

      return {
        id: enrolled.id,
        familyId: enrolled.familyId,
        name: enrolled.name,
        platform: enrolled.platform,
        status: enrolled.status,
        deviceCredential: enrolled.deviceCredential,
      };
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    if (isUniqueViolation(error)) {
      throw new AppError(409, "DEVICE_IDENTIFIER_IN_USE", "That device identifier is already enrolled.");
    }

    throw error;
  }
}
