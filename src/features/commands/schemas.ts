import { z } from "zod";
import { createAppCommandSchema } from "@/features/apps/schemas";
import { createContactCommandSchema } from "@/features/contacts/schemas";
import { createSettingsCommandSchema } from "@/features/settings/schemas";

export const createManagedCommandSchema = z.union([
  createAppCommandSchema,
  createContactCommandSchema,
  createSettingsCommandSchema,
]);

export type CreateManagedCommandInput = z.infer<typeof createManagedCommandSchema>;
