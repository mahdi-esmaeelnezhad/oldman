import { z } from "zod";
import { getDeviceSettingDefinition, isValidSettingValue } from "@/config/device-settings";

const jsonSettingValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const createSettingsCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("GET_SETTINGS"),
    payload: z.object({}).strict(),
  }),
  z.object({
    type: z.literal("SET_SETTING"),
    payload: z
      .object({
        key: z.string().trim().min(1).max(120),
        value: jsonSettingValueSchema,
      })
      .superRefine((payload, context) => {
        const definition = getDeviceSettingDefinition(payload.key);
        if (!definition) {
          context.addIssue({
            code: "custom",
            message: "Unknown setting key.",
            path: ["key"],
          });
          return;
        }
        if (!definition.writable) {
          context.addIssue({
            code: "custom",
            message: "Setting is read-only.",
            path: ["key"],
          });
          return;
        }
        if (!isValidSettingValue(definition, payload.value)) {
          context.addIssue({
            code: "custom",
            message: "Setting value type is invalid.",
            path: ["value"],
          });
        }
      }),
  }),
]);

export type CreateSettingsCommandInput = z.infer<typeof createSettingsCommandSchema>;
