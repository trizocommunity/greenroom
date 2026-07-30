import { z } from "zod";

export const participantGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
});

export const participantCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const participantSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  groupId: z.string().nullable(),
  categoryId: z.string().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable(),
  dateOfBirth: z.string(),
  standard: z.string().nullable(),
  chestNumber: z.string().nullable(),
  profileSlug: z.string().nullable(),
  isTeamLeader: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  group: participantGroupSchema.nullable(),
  category: participantCategorySchema.nullable(),
});

export const createParticipantInput = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  groupId: z.string().min(1),
  categoryId: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).default("MALE"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  standard: z.string().optional(),
});

export const updateParticipantInput = createParticipantInput.partial();

export const bulkCreateParticipantInput = z.object({
  participants: z.array(createParticipantInput).min(1).max(1000),
});

export const validateParticipantCandidate = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  groupId: z.string().min(1),
  categoryId: z.string().min(1),
});

export const validateParticipantsInput = z.object({
  candidates: z.array(validateParticipantCandidate).min(1).max(1000),
});

export const validateParticipantsResponse = z.record(z.string(), z.string());

export const exportExcelResponse = z.object({
  success: z.literal(true),
  data: z.string(),
  filename: z.string(),
});

export type Participant = z.infer<typeof participantSchema>;
export type CreateParticipantInput = z.infer<typeof createParticipantInput>;
export type UpdateParticipantInput = z.infer<typeof updateParticipantInput>;
export type BulkCreateParticipantInput = z.infer<
  typeof bulkCreateParticipantInput
>;
export type ValidateParticipantsInput = z.infer<
  typeof validateParticipantsInput
>;
export type ValidateParticipantsResponse = z.infer<
  typeof validateParticipantsResponse
>;
export type ExportExcelResponse = z.infer<typeof exportExcelResponse>;
