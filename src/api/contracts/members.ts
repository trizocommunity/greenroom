import { z } from "zod";

export const memberRoleEnum = z.enum(["ADMIN", "ANNOUNCER", "STAGE_MANAGER"]);

export const memberSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  userId: z.string().nullable(),
  fullName: z.string(),
  email: z.string(),
  role: memberRoleEnum,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const addMemberInput = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  role: memberRoleEnum,
});

export const updateMemberInput = z.object({
  fullName: z.string().min(1).optional(),
  role: memberRoleEnum.optional(),
});

export type Member = z.infer<typeof memberSchema>;
export type AddMemberInput = z.infer<typeof addMemberInput>;
export type UpdateMemberInput = z.infer<typeof updateMemberInput>;
export type MemberRole = z.infer<typeof memberRoleEnum>;
