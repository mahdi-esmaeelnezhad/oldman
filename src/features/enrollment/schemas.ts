import { z } from "zod";

export const redeemEnrollmentSchema = z.object({
  token: z.string().trim().min(20).max(200),
  deviceIdentifier: z.string().trim().min(8).max(200),
  name: z.string().trim().min(1).max(80),
  platform: z.literal("ANDROID"),
  manufacturer: z.string().trim().min(1).max(80).optional(),
  model: z.string().trim().min(1).max(80).optional(),
  androidVersion: z.string().trim().min(1).max(40).optional(),
  androidSdk: z.number().int().positive().max(100).optional(),
  appVersion: z.string().trim().min(1).max(40).optional(),
});
