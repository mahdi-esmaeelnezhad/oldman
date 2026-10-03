import { requireUser } from "@/server/auth/session";
import { errorResponse, json } from "@/server/http/api-error";
import { serializePublicUser } from "@/server/users/public-user";

export async function GET(): Promise<Response> {
  try {
    const user = await requireUser();
    return json({ user: serializePublicUser(user) });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
