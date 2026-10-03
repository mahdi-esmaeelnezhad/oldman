import { deviceGeofenceEventSchema } from "@/features/geofencing/schemas";
import { requireDeviceFromRequest } from "@/server/devices/device-auth";
import { recordGeofenceEventFromAgent } from "@/server/geofencing/geofence-service";
import { errorResponse, json } from "@/server/http/api-error";
import { readJson } from "@/server/http/read-json";

export async function POST(request: Request): Promise<Response> {
  try {
    const device = await requireDeviceFromRequest(request);
    const input = await readJson(request, deviceGeofenceEventSchema);
    const result = await recordGeofenceEventFromAgent(device.id, device.familyId, input);
    return json(result, result.accepted ? 201 : 200);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
