import { familyIdSchema } from "@/features/families/schemas";
import { deviceIdSchema } from "@/features/devices/schemas";
import { listFamilyAuditLogs } from "@/server/audit/audit-service";
import { requireUser } from "@/server/auth/session";
import { AppError, errorResponse, json } from "@/server/http/api-error";

type RouteContext = {
  params: Promise<{ familyId: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const { familyId } = await context.params;
    const parsedFamilyId = familyIdSchema.safeParse(familyId);
    if (!parsedFamilyId.success) {
      throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
    }

    const { searchParams } = new URL(request.url);
    const deviceIdParam = searchParams.get("deviceId");
    let deviceId: string | undefined;
    if (deviceIdParam) {
      const parsedDeviceId = deviceIdSchema.safeParse(deviceIdParam);
      if (!parsedDeviceId.success) {
        throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
      }
      deviceId = parsedDeviceId.data;
    }

    const takeParam = searchParams.get("take");
    const take = takeParam ? Number(takeParam) : undefined;
    if (takeParam && (!Number.isFinite(take) || take === undefined)) {
      throw new AppError(400, "VALIDATION_ERROR", "take must be a number.");
    }

    const auditLogs = await listFamilyAuditLogs(user.id, parsedFamilyId.data, {
      deviceId,
      take,
    });
    return json({ auditLogs });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
