import { z } from "zod";

export const cleanupResponse = z.object({
  success: z.literal(true),
  preArchived: z.number(),
  expired: z.number(),
});

export type CleanupResponse = z.infer<typeof cleanupResponse>;
