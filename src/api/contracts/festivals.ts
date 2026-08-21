import { z } from "zod";

export const festivalSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  tagline: z.string().nullable().optional(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  location: z.string().nullable(),
  publicSiteEnabled: z.boolean(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "EXPIRED"]),
  ownerId: z.string(),
  expiresAt: z.string().nullable(),
  tier: z.enum(["BASIC", "STANDARD", "PRO"]).nullable(),
  resultPdfUrl: z.string().nullable(),
  isLocked: z.boolean().optional(),
  tierLabel: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createFestivalInput = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  publicSiteEnabled: z.boolean().optional(),
  institutionName: z.string().optional(),
  institutionType: z.string().optional(),
});

export const updateFestivalInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  tagline: z.string().max(140).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  publicSiteEnabled: z.boolean().optional(),
  slug: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Subdomain must be lowercase alphanumeric with dashes only",
    )
    .optional(),
});

export const dashboardOverviewInput = z.object({
  festivalId: z.string(),
});

export const dashboardOverviewSchema = z.object({
  totalParticipants: z.number(),
  totalGroups: z.number(),
  totalCategories: z.number(),
  totalProgrammes: z.number(),
  totalJudges: z.number(),
  registrationsByDay: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    }),
  ),
});

export const analyticsSchema = z.object({
  participantsByCategory: z.array(
    z.object({
      categoryId: z.string(),
      categoryName: z.string(),
      count: z.number(),
    }),
  ),
  participantsByGroup: z.array(
    z.object({
      groupId: z.string(),
      groupName: z.string(),
      count: z.number(),
    }),
  ),
  programmeCompletionRate: z.array(
    z.object({
      programmeId: z.string(),
      programmeName: z.string(),
      assignedCount: z.number(),
      totalCount: z.number(),
    }),
  ),
});

export type Festival = z.infer<typeof festivalSchema>;
export type CreateFestivalInput = z.infer<typeof createFestivalInput>;
export type UpdateFestivalInput = z.infer<typeof updateFestivalInput>;
export type DashboardOverviewInput = z.infer<typeof dashboardOverviewInput>;
export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;
export type Analytics = z.infer<typeof analyticsSchema>;
