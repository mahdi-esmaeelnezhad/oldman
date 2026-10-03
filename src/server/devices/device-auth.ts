import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/server/auth/secrets";
import { AppError } from "@/server/http/api-error";
import { publishDeviceEvent, publishDeviceStatus } from "@/server/realtime/publish";

export type AuthenticatedDevice = {
  id: string;
  familyId: string;
  deviceIdentifier: string;
};

export async function requireDeviceFromRequest(request: Request): Promise<AuthenticatedDevice> {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "DEVICE_UNAUTHENTICATED", "Device credentials are required.");
  }

  const token = header.slice("Bearer ".length).trim();
  if (token.length < 20) {
    throw new AppError(401, "DEVICE_UNAUTHENTICATED", "Device credentials are required.");
  }

  const device = await prisma.device.findUnique({
    where: { credentialHash: hashSecret(token) },
    select: {
      id: true,
      familyId: true,
      deviceIdentifier: true,
    },
  });

  if (!device) {
    throw new AppError(401, "DEVICE_UNAUTHENTICATED", "Device credentials are required.");
  }

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: {
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
    familyId: updated.familyId,
    deviceId: updated.id,
    status: updated.status,
    lastSeenAt: updated.lastSeenAt ? updated.lastSeenAt.toISOString() : null,
  });
  publishDeviceEvent({
    familyId: updated.familyId,
    deviceId: updated.id,
    kind: "DEVICE_SEEN",
  });

  return device;
}
