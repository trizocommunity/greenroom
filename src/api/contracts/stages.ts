import { z } from "zod";

export const stageSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isOffStage: z.boolean(),
  createdByName: z.string().nullable().optional(),
  createdByEmail: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const stageDataInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export type Stage = z.infer<typeof stageSchema>;
export type StageDataInput = z.infer<typeof stageDataInput>;
