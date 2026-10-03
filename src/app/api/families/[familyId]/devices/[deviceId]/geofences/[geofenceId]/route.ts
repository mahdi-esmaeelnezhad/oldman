import { geofenceIdSchema, updateGeofenceSchema } from "@/features/geofencing/schemas";
import { deviceIdSchema } from "@/features/devices/schemas";
import { familyIdSchema } from "@/features/families/schemas";
import { requireUser } from "@/server/auth/session";
import { deleteGeofence, updateGeofence } from "@/server/geofencing/geofence-service";
import { AppError, errorResponse, json } from "@/server/http/api-error";
import { readJson } from "@/server/http/read-json";

type RouteContext = {
  params: Promise<{ familyId: string; deviceId: string; geofenceId: string }>;
};

async function readIds(context: RouteContext) {
  const { familyId, deviceId, geofenceId } = await context.params;
  const parsedFamilyId = familyIdSchema.safeParse(familyId);
  const parsedDeviceId = deviceIdSchema.safeParse(deviceId);
  const parsedGeofenceId = geofenceIdSchema.safeParse(geofenceId);
  if (!parsedFamilyId.success) {
    throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
  }
  if (!parsedDeviceId.success) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }
  if (!parsedGeofenceId.success) {
    throw new AppError(404, "GEOFENCE_NOT_FOUND", "Geofence was not found.");
  }

  return {
    familyId: parsedFamilyId.data,
    deviceId: parsedDeviceId.data,
    geofenceId: parsedGeofenceId.data,
  };
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const ids = await readIds(context);
    const input = await readJson(request, updateGeofenceSchema);
    const geofence = await updateGeofence(user.id, ids.familyId, ids.deviceId, ids.geofenceId, input);
    return json({ geofence });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const ids = await readIds(context);
    await deleteGeofence(user.id, ids.familyId, ids.deviceId, ids.geofenceId);
    return json({ ok: true });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
