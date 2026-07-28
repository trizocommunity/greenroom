import { z } from "zod";

export const activitySchema = z.object({
  configId: z.string(),
  judgingMode: z.string(),
  status: z.string(),
  programme: z.object({ id: z.string(), name: z.string() }).nullable(),
  stage: z.object({ id: z.string(), name: z.string() }).nullable(),
  judgedPointsCount: z.number(),
  averagePoints: z.number().nullable(),
});

export const judgeSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  activities: z.array(activitySchema).optional(),
  programmes: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional(),
  stages: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  assignedStages: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional(),
});

export const judgeInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  stageIds: z.array(z.string()).optional(),
});

export type Judge = z.infer<typeof judgeSchema>;
export type JudgeInput = z.infer<typeof judgeInput>;
