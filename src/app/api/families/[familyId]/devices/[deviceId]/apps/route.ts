import { deviceIdSchema } from "@/features/devices/schemas";
import { familyIdSchema } from "@/features/families/schemas";
import { requireUser } from "@/server/auth/session";
import { getDeviceAppsPage } from "@/server/apps/app-service";
import { AppError, errorResponse, json } from "@/server/http/api-error";

type RouteContext = {
  params: Promise<{ familyId: string; deviceId: string }>;
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const { familyId, deviceId } = await context.params;
    const parsedFamilyId = familyIdSchema.safeParse(familyId);
    const parsedDeviceId = deviceIdSchema.safeParse(deviceId);

    if (!parsedFamilyId.success) {
      throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
    }
    if (!parsedDeviceId.success) {
      throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
    }

    const page = await getDeviceAppsPage(user.id, parsedFamilyId.data, parsedDeviceId.data);
    return json(page);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
