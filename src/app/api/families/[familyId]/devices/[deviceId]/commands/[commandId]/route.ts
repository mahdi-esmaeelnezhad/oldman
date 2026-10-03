import { commandIdSchema } from "@/features/apps/schemas";
import { deviceIdSchema } from "@/features/devices/schemas";
import { familyIdSchema } from "@/features/families/schemas";
import { requireUser } from "@/server/auth/session";
import { cancelCommandForUser, getCommandForUser } from "@/server/commands/command-service";
import { AppError, errorResponse, json } from "@/server/http/api-error";

type RouteContext = {
  params: Promise<{ familyId: string; deviceId: string; commandId: string }>;
};

async function readIds(context: RouteContext) {
  const { familyId, deviceId, commandId } = await context.params;
  const parsedFamilyId = familyIdSchema.safeParse(familyId);
  const parsedDeviceId = deviceIdSchema.safeParse(deviceId);
  const parsedCommandId = commandIdSchema.safeParse(commandId);

  if (!parsedFamilyId.success) {
    throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
  }
  if (!parsedDeviceId.success) {
    throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
  }
  if (!parsedCommandId.success) {
    throw new AppError(404, "COMMAND_NOT_FOUND", "Command was not found.");
  }

  return {
    familyId: parsedFamilyId.data,
    deviceId: parsedDeviceId.data,
    commandId: parsedCommandId.data,
  };
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const ids = await readIds(context);
    const command = await getCommandForUser(user.id, ids.familyId, ids.deviceId, ids.commandId);
    return json({ command });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const ids = await readIds(context);
    const command = await cancelCommandForUser(user.id, ids.familyId, ids.deviceId, ids.commandId);
    return json({ command });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
