import { z } from "zod";

export const deviceIdSchema = z.string().uuid();
