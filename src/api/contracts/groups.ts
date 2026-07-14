import { z } from "zod";

export const groupSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  name: z.string(),
  seriesStart: z.number().nullable(),
  color: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createGroupInput = z.object({
  name: z.string().min(1),
  seriesStart: z.number().optional(),
  color: z.string().optional(),
});

export const updateGroupInput = z.object({
  name: z.string().min(1).optional(),
  seriesStart: z.number().optional(),
  color: z.string().optional(),
  teamLeaderIds: z.array(z.string()).optional(),
});

export type Group = z.infer<typeof groupSchema>;
export type CreateGroupInput = z.infer<typeof createGroupInput>;
export type UpdateGroupInput = z.infer<typeof updateGroupInput>;
