import { z } from "zod";

export const studentGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
});

export const studentCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const studentSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  groupId: z.string().nullable(),
  categoryId: z.string().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable(),
  age: z.number().nullable(),
  dateOfBirth: z.string().nullable(),
  standard: z.string().nullable(),
  chestNumber: z.string().nullable(),
  profileSlug: z.string().nullable(),
  isTeamLeader: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  group: studentGroupSchema.nullable(),
  category: studentCategorySchema.nullable(),
});

export const createStudentInput = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  groupId: z.string().min(1),
  categoryId: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).default("MALE"),
  age: z.number().optional(),
  standard: z.string().optional(),
});

export const updateStudentInput = createStudentInput.partial();

export const bulkCreateStudentInput = z.object({
  students: z.array(createStudentInput).min(1).max(1000),
});

export const validateStudentCandidate = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  groupId: z.string().min(1),
  categoryId: z.string().min(1),
});

export const validateStudentsInput = z.object({
  candidates: z.array(validateStudentCandidate).min(1).max(1000),
});

export const validateStudentsResponse = z.record(z.string(), z.string());

export const exportExcelResponse = z.object({
  success: z.literal(true),
  data: z.string(),
  filename: z.string(),
});

export type Student = z.infer<typeof studentSchema>;
export type CreateStudentInput = z.infer<typeof createStudentInput>;
export type UpdateStudentInput = z.infer<typeof updateStudentInput>;
export type BulkCreateStudentInput = z.infer<typeof bulkCreateStudentInput>;
export type ValidateStudentsInput = z.infer<typeof validateStudentsInput>;
export type ValidateStudentsResponse = z.infer<typeof validateStudentsResponse>;
export type ExportExcelResponse = z.infer<typeof exportExcelResponse>;
