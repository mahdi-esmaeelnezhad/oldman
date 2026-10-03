import { deviceLocationUpdateSchema } from "@/features/geofencing/schemas";
import { requireDeviceFromRequest } from "@/server/devices/device-auth";
import { updateDeviceLocationFromAgent } from "@/server/geofencing/geofence-service";
import { errorResponse, json } from "@/server/http/api-error";
import { readJson } from "@/server/http/read-json";

export async function POST(request: Request): Promise<Response> {
  try {
    const device = await requireDeviceFromRequest(request);
    const input = await readJson(request, deviceLocationUpdateSchema);
    await updateDeviceLocationFromAgent(device.id, input);
    return json({ ok: true });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
