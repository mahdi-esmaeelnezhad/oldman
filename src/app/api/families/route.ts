import { createFamilySchema } from "@/features/families/schemas";
import { requireUser } from "@/server/auth/session";
import { createFamily, listFamiliesForUser } from "@/server/families/family-service";
import { errorResponse, json } from "@/server/http/api-error";
import { readJson } from "@/server/http/read-json";

export async function GET(): Promise<Response> {
  try {
    const user = await requireUser();
    const families = await listFamiliesForUser(user.id);
    return json({ families });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireUser();
    const input = await readJson(request, createFamilySchema);
    const family = await createFamily(user.id, input.name);
    return json({ family }, 201);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
