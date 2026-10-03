import { familyIdSchema } from "@/features/families/schemas";
import { requireUser } from "@/server/auth/session";
import { createEnrollmentSession } from "@/server/enrollment/enrollment-service";
import { AppError, errorResponse, json } from "@/server/http/api-error";

type RouteContext = {
  params: Promise<{ familyId: string }>;
};

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const { familyId } = await context.params;
    const parsedId = familyIdSchema.safeParse(familyId);
    if (!parsedId.success) {
      throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
    }

    const enrollment = await createEnrollmentSession(user.id, parsedId.data);
    return json({ enrollment }, 201);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
