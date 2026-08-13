import { z } from "zod";

export const programmeCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const programmeAssignmentSchema = z.object({
  id: z.string(),
  participantId: z.string().nullable(),
  groupId: z.string().nullable(),
  teamNumber: z.number().int().positive().nullable(),
  assignedAt: z.string().nullable(),
  participant: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      chestNumber: z.string().nullable(),
    })
    .nullable(),
});

export const programmeSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  categoryId: z.string(),
  name: z.string(),
  type: z.enum(["INDIVIDUAL", "GROUP"]),
  stageType: z.enum(["STAGE", "NON_STAGE"]),
  maxParticipantsPerGroup: z.number().int().positive().nullable(),
  maxTeamsPerGroup: z.number().int().positive().nullable(),
  maxParticipantsPerTeam: z.number().int().positive().nullable(),
  maxPoints: z.number().nullable(),
  durationMode: z.enum(["SEQUENTIAL", "PARALLEL"]),
  timePerUnitMinutes: z.number().int().positive(),
  parallelDurationMinutes: z.number().int().positive().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  category: programmeCategorySchema.nullable().optional(),
  assignments: z.array(programmeAssignmentSchema).optional(),
});

export const createProgrammeInput = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  type: z.enum(["INDIVIDUAL", "GROUP"]),
  stageType: z.enum(["STAGE", "NON_STAGE"]).default("NON_STAGE"),
  maxParticipantsPerGroup: z.number().int().positive().optional(),
  maxTeamsPerGroup: z.number().int().positive().optional(),
  maxParticipantsPerTeam: z.number().int().positive().optional(),
  maxPoints: z.number().optional(),
  durationMode: z.enum(["SEQUENTIAL", "PARALLEL"]).default("SEQUENTIAL"),
  timePerUnitMinutes: z.number().int().positive().default(5),
  parallelDurationMinutes: z.number().int().positive().optional().nullable(),
});

export const updateProgrammeInput = createProgrammeInput
  .partial()
  .omit({ categoryId: true });

export const bulkCreateProgrammesInput = z.object({
  programmes: z.array(createProgrammeInput),
});

export type Programme = z.infer<typeof programmeSchema>;
export type CreateProgrammeInput = z.infer<typeof createProgrammeInput>;
export type UpdateProgrammeInput = z.infer<typeof updateProgrammeInput>;
export type BulkCreateProgrammesInput = z.infer<
  typeof bulkCreateProgrammesInput
>;
