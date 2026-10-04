import { locationSearchSchema } from "@/features/geofencing/schemas";
import { requireUser } from "@/server/auth/session";
import { AppError, errorResponse, json } from "@/server/http/api-error";

type SearchHit = {
  label: string;
  latitude: number;
  longitude: number;
};

async function searchNominatim(query: string): Promise<SearchHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "8");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "ir");
  url.searchParams.set("addressdetails", "0");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "FamilyCare/0.1 (caregiver-pwa; location-search)",
      Accept: "application/json",
      "Accept-Language": "fa,fa-IR,en",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`nominatim:${response.status}`);
  }

  const body = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;

  return body
    .map((item) => ({
      label: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude) &&
        item.longitude > 40 &&
        item.longitude < 65 &&
        item.latitude > 24 &&
        item.latitude < 41,
    );
}

async function searchPhoton(query: string): Promise<SearchHit[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "fa");
  url.searchParams.set("bbox", "44.0,25.0,63.5,39.8");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "FamilyCare/0.1 (caregiver-pwa; location-search)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`photon:${response.status}`);
  }

  const body = (await response.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: {
        name?: string;
        city?: string;
        state?: string;
        country?: string;
        street?: string;
      };
    }>;
  };

  return (body.features ?? [])
    .map((feature) => {
      const [longitude, latitude] = feature.geometry?.coordinates ?? [];
      const parts = [
        feature.properties?.name,
        feature.properties?.street,
        feature.properties?.city,
        feature.properties?.state,
        feature.properties?.country,
      ].filter(Boolean);
      return {
        label: parts.join("، ") || `${latitude}, ${longitude}`,
        latitude: Number(latitude),
        longitude: Number(longitude),
      };
    })
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const parsed = locationSearchSchema.safeParse({ q: searchParams.get("q") ?? "" });
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Search query is invalid.");
    }

    let results: SearchHit[] = [];
    try {
      results = await searchNominatim(parsed.data.q);
    } catch {
      results = [];
    }

    if (results.length === 0) {
      try {
        results = await searchPhoton(parsed.data.q);
      } catch {
        throw new AppError(502, "LOCATION_SEARCH_FAILED", "Location search failed.");
      }
    }

    return json({ results });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
