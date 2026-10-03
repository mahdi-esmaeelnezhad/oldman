import { z } from "zod";

export const geofenceIdSchema = z.string().uuid();

export const createGeofenceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(50).max(50000),
  enabled: z.boolean().optional(),
});

export const updateGeofenceSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radiusMeters: z.number().int().min(50).max(50000).optional(),
    enabled: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.latitude !== undefined ||
      value.longitude !== undefined ||
      value.radiusMeters !== undefined ||
      value.enabled !== undefined,
    { message: "At least one field is required." },
  );

export const deviceLocationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  recordedAt: z.string().datetime().optional(),
  locationPermission: z.enum(["UNKNOWN", "PROMPT", "GRANTED", "DENIED"]).optional(),
  locationServiceEnabled: z.boolean().optional(),
});

export const deviceGeofenceEventSchema = z.object({
  geofenceId: z.string().uuid(),
  type: z.enum(["ENTERED", "EXITED"]),
  occurredAt: z.string().datetime().optional(),
});

export const locationSearchSchema = z.object({
  q: z.string().trim().min(2).max(120),
});
