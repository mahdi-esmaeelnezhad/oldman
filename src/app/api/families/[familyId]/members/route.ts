import { familyIdSchema, inviteMemberSchema } from "@/features/families/schemas";
import { requireUser } from "@/server/auth/session";
import { inviteFamilyMember, listFamilyMembers } from "@/server/families/family-service";
import { AppError, errorResponse, json } from "@/server/http/api-error";
import { readJson } from "@/server/http/read-json";

type RouteContext = {
  params: Promise<{ familyId: string }>;
};

async function readFamilyId(context: RouteContext): Promise<string> {
  const { familyId } = await context.params;
  const parsedId = familyIdSchema.safeParse(familyId);
  if (!parsedId.success) {
    throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
  }

  return parsedId.data;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const familyId = await readFamilyId(context);
    const members = await listFamilyMembers(user.id, familyId);
    return json({ members });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const familyId = await readFamilyId(context);
    const input = await readJson(request, inviteMemberSchema);
    const member = await inviteFamilyMember(user.id, familyId, input.email, input.role);
    return json({ member }, 201);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
