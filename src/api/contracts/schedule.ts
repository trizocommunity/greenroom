import { z } from "zod";

export const scheduleEntrySchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  type: z.enum(["PROGRAMME", "SESSION"]),
  programmeId: z.string().nullable(),
  stageId: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  speakers: z.string().nullable(),
  sessionType: z.enum(["GENERAL", "CEREMONY", "TALK", "CONCERT"]).nullable(),
  startTime: z.string(),
  endTime: z.string().nullable(),
  order: z.number(),
  scheduleDayKey: z.string().nullable(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  updatedAt: z.string(),
});

export const createScheduleEntryInput = z.object({
  type: z.enum(["PROGRAMME", "SESSION"]),
  programmeId: z.string().nullable().optional(),
  stageId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  speakers: z.string().nullable().optional(),
  sessionType: z
    .enum(["GENERAL", "CEREMONY", "TALK", "CONCERT"])
    .nullable()
    .optional(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  order: z.number().optional(),
  scheduleDayKey: z.string().nullable().optional(),
});

export const updateScheduleEntryInput = createScheduleEntryInput.partial();

export const reorderScheduleInput = z.object({
  festivalId: z.string(),
  entryIds: z.array(z.string()),
});

export const typeFilterEnum = z.enum(["PROGRAMME", "SESSION"]);

export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;
export type CreateScheduleEntryInput = z.infer<typeof createScheduleEntryInput>;
export type UpdateScheduleEntryInput = z.infer<typeof updateScheduleEntryInput>;
export type ReorderScheduleInput = z.infer<typeof reorderScheduleInput>;
