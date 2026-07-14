import { z } from "zod";

export const categoryMinimalSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const programmeMinimalSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["INDIVIDUAL", "GROUP"]),
  category: categoryMinimalSchema.nullable(),
});

export const studentMinimalSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  chestNumber: z.string().nullable(),
  groupId: z.string().nullable(),
  categoryId: z.string().nullable(),
  group: z.object({ id: z.string(), name: z.string() }).nullable(),
});

export const groupMinimalSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
});

export const assignmentSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  programmeId: z.string(),
  studentId: z.string().nullable(),
  groupId: z.string().nullable(),
  teamNumber: z.number().int().positive().nullable(),
  createdByEmail: z.string().nullable(),
  createdByName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  assignedAt: z.string().nullable(),
  programme: programmeMinimalSchema.optional(),
  student: studentMinimalSchema.optional(),
  group: groupMinimalSchema.optional(),
  category: z.object({ id: z.string(), name: z.string() }).optional(),
});

export const createAssignmentInput = z.object({
  programmeId: z.string(),
  studentId: z.string().optional(),
  groupId: z.string().optional(),
  teamNumber: z.number().int().positive().optional(),
});

export const bulkCreateAssignmentInput = z.object({
  assignments: z.array(createAssignmentInput).min(1).max(1000),
});

export const updateAssignmentInput = z.object({
  programmeId: z.string().optional(),
  studentId: z.string().optional(),
  groupId: z.string().optional(),
});

export const deleteTeamInput = z.object({
  programmeId: z.string(),
  groupId: z.string(),
  teamNumber: z.number().int().positive(),
});

export const getTeamMembersInput = z.object({
  festivalId: z.string(),
  programmeId: z.string(),
  groupId: z.string(),
  teamNumber: z.number().int().positive(),
});

export const bulkCreateResult = z.object({
  successCount: z.number(),
  errors: z.array(
    z.object({
      name: z.string(),
      error: z.string(),
    }),
  ),
});

export type Assignment = z.infer<typeof assignmentSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentInput>;
export type BulkCreateAssignmentInput = z.infer<
  typeof bulkCreateAssignmentInput
>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentInput>;
export type DeleteTeamInput = z.infer<typeof deleteTeamInput>;
export type GetTeamMembersInput = z.infer<typeof getTeamMembersInput>;
export type BulkCreateResult = z.infer<typeof bulkCreateResult>;
