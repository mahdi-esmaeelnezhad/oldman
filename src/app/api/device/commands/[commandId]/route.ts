import { commandIdSchema, deviceCommandProgressSchema, deviceCommandResultSchema } from "@/features/apps/schemas";
import { completeCommandForDevice, updateCommandProgressForDevice } from "@/server/commands/command-service";
import { requireDeviceFromRequest } from "@/server/devices/device-auth";
import { AppError, errorResponse, json } from "@/server/http/api-error";
import { readJson } from "@/server/http/read-json";

type RouteContext = {
  params: Promise<{ commandId: string }>;
};

async function readCommandId(context: RouteContext): Promise<string> {
  const { commandId } = await context.params;
  const parsed = commandIdSchema.safeParse(commandId);
  if (!parsed.success) {
    throw new AppError(404, "COMMAND_NOT_FOUND", "Command was not found.");
  }

  return parsed.data;
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const device = await requireDeviceFromRequest(request);
    const commandId = await readCommandId(context);
    const input = await readJson(request, deviceCommandProgressSchema);
    const command = await updateCommandProgressForDevice(device.id, commandId, input.status);
    return json({ command });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const device = await requireDeviceFromRequest(request);
    const commandId = await readCommandId(context);
    const input = await readJson(request, deviceCommandResultSchema);
    const command = await completeCommandForDevice(device.id, commandId, {
      status: input.status,
      data: input.status === "SUCCESS" ? (input.data ?? {}) : null,
      error: input.status === "SUCCESS" ? null : input.error,
    });
    return json({ command });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
