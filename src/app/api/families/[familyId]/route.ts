import { familyIdSchema } from "@/features/families/schemas";
import { requireUser } from "@/server/auth/session";
import { getFamilyForUser } from "@/server/families/family-service";
import { AppError, errorResponse, json } from "@/server/http/api-error";

type RouteContext = {
  params: Promise<{ familyId: string }>;
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const { familyId } = await context.params;
    const parsedId = familyIdSchema.safeParse(familyId);
    if (!parsedId.success) {
      throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
    }

    const family = await getFamilyForUser(user.id, parsedId.data);
    return json({ family });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
