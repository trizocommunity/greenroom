import { z } from "zod";

export const stageManagerAssignmentSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  stageId: z.string(),
  memberId: z.string(),
  createdAt: z.string(),
  stage: z.object({ id: z.string(), name: z.string() }),
  member: z.object({
    id: z.string(),
    role: z.string(),
    isActive: z.boolean(),
    user: z.object({
      displayName: z.string().nullable(),
      fullName: z.string().nullable(),
      email: z.string().nullable(),
    }),
  }),
});

export const assignStageManagerInput = z.object({
  stageId: z.string(),
  memberId: z.string(),
});

export type StageManagerAssignment = z.infer<
  typeof stageManagerAssignmentSchema
>;
export type AssignStageManagerInput = z.infer<typeof assignStageManagerInput>;
