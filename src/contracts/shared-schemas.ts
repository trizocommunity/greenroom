import { z } from "zod";
import { GlobalRole } from "@/core/types/app-enums";

export const globalRoleSchema = z.enum(["USER", "SUPER_ADMIN"]);

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string().nullable(),
  displayName: z.string().nullable(),
  globalRole: globalRoleSchema,
  isActive: z.boolean().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const userWithoutPasswordSchema = userSchema.omit({
  isActive: true,
});
export type UserWithoutPassword = z.infer<typeof userWithoutPasswordSchema>;

export const actionResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.discriminatedUnion("success", [
    z.object({ success: z.literal(true), data: dataSchema }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]);

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});
