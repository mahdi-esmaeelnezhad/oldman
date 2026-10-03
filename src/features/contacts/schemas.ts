import { z } from "zod";

export const createContactCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("CREATE_CONTACT"),
    payload: z.object({
      displayName: z.string().trim().min(1).max(120),
      phoneNumber: z.string().trim().min(3).max(40),
    }),
  }),
  z.object({
    type: z.literal("UPDATE_CONTACT"),
    payload: z
      .object({
        contactId: z.string().trim().min(1).max(120),
        displayName: z.string().trim().min(1).max(120).optional(),
        phoneNumber: z.string().trim().min(3).max(40).optional(),
      })
      .refine((value) => value.displayName !== undefined || value.phoneNumber !== undefined, {
        message: "At least one contact field is required.",
      }),
  }),
  z.object({
    type: z.literal("DELETE_CONTACT"),
    payload: z.object({
      contactId: z.string().trim().min(1).max(120),
    }),
  }),
]);

export type CreateContactCommandInput = z.infer<typeof createContactCommandSchema>;
