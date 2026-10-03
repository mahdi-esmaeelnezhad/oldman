import { z } from "zod";
import { appCommandTypes } from "@/config/device-capabilities";

export const createAppCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("INSTALL_APP"),
    payload: z.object({
      packageName: z.string().trim().min(1).max(200),
    }),
  }),
  z.object({
    type: z.literal("UNINSTALL_APP"),
    payload: z.object({
      packageName: z.string().trim().min(1).max(200),
    }),
  }),
  z.object({
    type: z.literal("ENABLE_APP"),
    payload: z.object({
      packageName: z.string().trim().min(1).max(200),
    }),
  }),
  z.object({
    type: z.literal("DISABLE_APP"),
    payload: z.object({
      packageName: z.string().trim().min(1).max(200),
    }),
  }),
]);

export const commandIdSchema = z.string().uuid();

export const deviceCommandProgressSchema = z.object({
  status: z.enum(["RECEIVED", "EXECUTING"]),
});

export const deviceCommandResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("SUCCESS"),
    data: z.record(z.string(), z.unknown()).nullable().optional(),
    error: z.null().optional(),
  }),
  z.object({
    status: z.enum(["FAILED", "UNSUPPORTED"]),
    data: z.null().optional(),
    error: z.object({
      code: z.string().trim().min(1).max(80),
      message: z.string().trim().min(1).max(400),
    }),
  }),
]);

export type CreateAppCommandInput = z.infer<typeof createAppCommandSchema>;

export const appCommandTypeSchema = z.enum(appCommandTypes);
