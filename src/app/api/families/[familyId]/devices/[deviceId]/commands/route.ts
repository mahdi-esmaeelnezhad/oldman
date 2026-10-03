import { createManagedCommandSchema } from "@/features/commands/schemas";
import { deviceIdSchema } from "@/features/devices/schemas";
import { familyIdSchema } from "@/features/families/schemas";
import { requireUser } from "@/server/auth/session";
import {
  createAppCommand,
  createContactCommand,
  createSettingsCommand,
  listRecentDeviceCommands,
} from "@/server/commands/command-service";
import { AppError, errorResponse, json } from "@/server/http/api-error";
import { readJson } from "@/server/http/read-json";

type RouteContext = {
  params: Promise<{ familyId: string; deviceId: string }>;
};

async function readIds(context: RouteContext): Promise<{ familyId: string; deviceId: string }> {
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
    const commands = await listRecentDeviceCommands(user.id, familyId, deviceId);
    return json({ commands });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const { familyId, deviceId } = await readIds(context);
    const input = await readJson(request, createManagedCommandSchema);

    switch (input.type) {
      case "INSTALL_APP":
      case "UNINSTALL_APP":
      case "ENABLE_APP":
      case "DISABLE_APP": {
        const command = await createAppCommand(user.id, familyId, deviceId, input.type, input.payload);
        return json({ command }, 201);
      }
      case "CREATE_CONTACT":
      case "UPDATE_CONTACT":
      case "DELETE_CONTACT": {
        const command = await createContactCommand(
          user.id,
          familyId,
          deviceId,
          input.type,
          input.payload,
        );
        return json({ command }, 201);
      }
      case "GET_SETTINGS":
      case "SET_SETTING": {
        const command = await createSettingsCommand(
          user.id,
          familyId,
          deviceId,
          input.type,
          input.payload,
        );
        return json({ command }, 201);
      }
      default: {
        const exhaustive: never = input;
        throw new AppError(400, "VALIDATION_ERROR", `Unsupported command: ${JSON.stringify(exhaustive)}`);
      }
    }
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
