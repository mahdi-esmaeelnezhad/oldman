import { familyIdSchema } from "@/features/families/schemas";
import { requireUser } from "@/server/auth/session";
import { listFamilyNotifications } from "@/server/geofencing/geofence-service";
import { AppError, errorResponse, json } from "@/server/http/api-error";

type RouteContext = {
  params: Promise<{ familyId: string }>;
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const { familyId } = await context.params;
    const parsedFamilyId = familyIdSchema.safeParse(familyId);
    if (!parsedFamilyId.success) {
      throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
    }

    const notifications = await listFamilyNotifications(user.id, parsedFamilyId.data);
    return json({ notifications });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
