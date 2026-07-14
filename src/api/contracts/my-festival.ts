import { z } from "zod";

export const myFestivalSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  location: z.string().nullable(),
  isPublic: z.boolean(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "EXPIRED"]),
  ownerId: z.string(),
  expiresAt: z.string().nullable(),
  tier: z.enum(["BASIC", "STANDARD", "PRO"]).nullable(),
  resultPdfUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const myFestivalResponse = z.object({
  festival: myFestivalSchema.nullable(),
});

export const joinedFestivalSchema = myFestivalSchema.extend({
  memberRole: z.enum(["ADMIN", "ANNOUNCER", "STAGE_MANAGER"]),
  memberSince: z.string(),
});

export type MyFestivalResponse = z.infer<typeof myFestivalResponse>;
export type JoinedFestival = z.infer<typeof joinedFestivalSchema>;
