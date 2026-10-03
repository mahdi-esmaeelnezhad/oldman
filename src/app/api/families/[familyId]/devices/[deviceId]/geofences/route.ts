import { createGeofenceSchema } from "@/features/geofencing/schemas";
import { deviceIdSchema } from "@/features/devices/schemas";
import { familyIdSchema } from "@/features/families/schemas";
import { requireUser } from "@/server/auth/session";
import { createGeofence, listGeofencesForDevice } from "@/server/geofencing/geofence-service";
import { AppError, errorResponse, json } from "@/server/http/api-error";
import { readJson } from "@/server/http/read-json";

type RouteContext = {
  params: Promise<{ familyId: string; deviceId: string }>;
};

async function readIds(context: RouteContext) {
  const { familyId, deviceId } = await context.params;
  const parsedFamilyId = familyIdSchema.safeParse(familyId);
  const parsedDeviceId = deviceIdSchema.safeParse(deviceId);
  if (!parsedFamilyId.success) {
    throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
  }
  if (!parsedDeviceId.success) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }

  return { familyId: parsedFamilyId.data, deviceId: parsedDeviceId.data };
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const { familyId, deviceId } = await readIds(context);
    const geofences = await listGeofencesForDevice(user.id, familyId, deviceId);
    return json({ geofences });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const { familyId, deviceId } = await readIds(context);
    const input = await readJson(request, createGeofenceSchema);
    const geofence = await createGeofence(user.id, familyId, deviceId, input);
    return json({ geofence }, 201);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
