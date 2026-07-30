import { z } from "zod";

export const judgeStageAssignmentSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  stageId: z.string(),
  judgeId: z.string(),
  createdAt: z.string(),
  stage: z.object({ id: z.string(), name: z.string() }),
  judge: z.object({ id: z.string(), name: z.string() }),
});

export const assignJudgeStageInput = z.object({
  stageId: z.string(),
  judgeId: z.string(),
});

export type JudgeStageAssignment = z.infer<typeof judgeStageAssignmentSchema>;
export type AssignJudgeStageInput = z.infer<typeof assignJudgeStageInput>;
