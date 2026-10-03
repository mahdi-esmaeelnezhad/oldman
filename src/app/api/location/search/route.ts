import { locationSearchSchema } from "@/features/geofencing/schemas";
import { requireUser } from "@/server/auth/session";
import { AppError, errorResponse, json } from "@/server/http/api-error";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const parsed = locationSearchSchema.safeParse({ q: searchParams.get("q") ?? "" });
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Search query is invalid.");
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");
    url.searchParams.set("q", parsed.data.q);

    const response = await fetch(url, {
      headers: {
        "user-agent": "FamilyCare/0.1 (local-dev)",
        accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new AppError(502, "LOCATION_SEARCH_FAILED", "Location search failed.");
    }

    const body = (await response.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;

    return json({
      results: body.map((item) => ({
        label: item.display_name,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
      })),
    });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
