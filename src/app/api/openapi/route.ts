import { buildOpenApiSpec } from "@/server/openapi/spec";
import { json } from "@/server/http/api-error";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  return json(buildOpenApiSpec(baseUrl));
}
