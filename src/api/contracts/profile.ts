import { z } from "zod";

import { zodTimezoneLoose } from "@/core/datetime";

export const profileSchema = z.object({
  userId: z.string(),
  role: z.enum(["USER", "SUPER_ADMIN"]),
  expires: z.string(),
});

export const updateProfileInput = z.object({
  fullName: z.string().min(2).optional(),
  displayName: z.string().min(2).optional(),
  phone: z.string().optional(),
  age: z.number().optional(),
  userRole: z.string().optional(),
  timezone: zodTimezoneLoose.optional(),
});

export const getExpiredResultsPdfInput = z.object({
  slug: z.string(),
});

export const expiredResultsPdfResponse = z.object({
  url: z.string().nullable(),
  isRedirect: z.boolean(),
});

export type Profile = z.infer<typeof profileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;
export type GetExpiredResultsPdfInput = z.infer<
  typeof getExpiredResultsPdfInput
>;
export type ExpiredResultsPdfResponse = z.infer<
  typeof expiredResultsPdfResponse
>;
