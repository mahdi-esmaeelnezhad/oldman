import { z } from "zod";

export const userRoles = ["OWNER", "CAREGIVER", "TECHNICAL_HELPER", "VIEWER"] as const;

export const createFamilySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(userRoles),
});

export const familyIdSchema = z.string().uuid();
