import { z } from "zod";

export const unusedCreditSchema = z.object({
  id: z.string(),
  amount: z.number(),
  purpose: z.string().nullable(),
  tier: z.enum(["BASIC", "STANDARD", "PRO"]).nullable(),
  validFrom: z.string(),
  validUntil: z.string().nullable(),
});

export type UnusedCredit = z.infer<typeof unusedCreditSchema>;
