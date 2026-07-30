import { z } from "zod";

export const resultSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  programmeId: z.string(),
  assignmentId: z.string(),
  grade: z.string().nullable(),
  position: z.number().int().positive().nullable(),
  points: z.number().nullable(),
  remarks: z.string().nullable(),
  isPublished: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const saveResultInput = z.object({
  festivalId: z.string(),
  programmeId: z.string(),
  assignmentId: z.string(),
  grade: z.string().nullable().optional(),
  position: z.number().int().positive().nullable().optional(),
  points: z.number().optional(),
  remarks: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
});

export const publishResultInput = z.object({
  festivalId: z.string(),
  programmeId: z.string(),
});

export type Result = z.infer<typeof resultSchema>;
export type SaveResultInput = z.infer<typeof saveResultInput>;
export type PublishResultInput = z.infer<typeof publishResultInput>;
