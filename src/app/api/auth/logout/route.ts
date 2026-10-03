import { destroySession } from "@/server/auth/session";
import { errorResponse, json } from "@/server/http/api-error";

export async function POST(): Promise<Response> {
  try {
    await destroySession();
    return json({ ok: true });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
