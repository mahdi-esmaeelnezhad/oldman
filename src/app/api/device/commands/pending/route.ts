import { listPendingCommandsForDevice } from "@/server/commands/command-service";
import { requireDeviceFromRequest } from "@/server/devices/device-auth";
import { errorResponse, json } from "@/server/http/api-error";

export async function GET(request: Request): Promise<Response> {
  try {
    const device = await requireDeviceFromRequest(request);
    const commands = await listPendingCommandsForDevice(device.id);
    return json({ commands });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
