import { redeemEnrollmentSchema } from "@/features/enrollment/schemas";
import { redeemEnrollmentToken } from "@/server/enrollment/enrollment-service";
import { errorResponse, json } from "@/server/http/api-error";
import { readJson } from "@/server/http/read-json";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await readJson(request, redeemEnrollmentSchema);
    const device = await redeemEnrollmentToken(input);
    return json({ device }, 201);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
