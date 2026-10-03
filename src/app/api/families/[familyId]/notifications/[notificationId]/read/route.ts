import { z } from "zod";
import { familyIdSchema } from "@/features/families/schemas";
import { requireUser } from "@/server/auth/session";
import { markFamilyNotificationRead } from "@/server/geofencing/geofence-service";
import { AppError, errorResponse, json } from "@/server/http/api-error";

type RouteContext = {
  params: Promise<{ familyId: string; notificationId: string }>;
};

const notificationIdSchema = z.string().uuid();

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const { familyId, notificationId } = await context.params;
    const parsedFamilyId = familyIdSchema.safeParse(familyId);
    const parsedNotificationId = notificationIdSchema.safeParse(notificationId);
    if (!parsedFamilyId.success) {
      throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
    }
    if (!parsedNotificationId.success) {
      throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification was not found.");
    }

    const notification = await markFamilyNotificationRead(
      user.id,
      parsedFamilyId.data,
      parsedNotificationId.data,
    );
    return json({ notification });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
