import { z } from "zod";

export const festivalStep1Schema = z.object({
  name: z.string().min(2, "Festival name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().min(2, "Location is required"),
});

export const festivalStep2Schema = z.object({
  orgName: z.string().min(2, "Organization name is required"),
  orgDescription: z.string().optional(),
  orgWebsite: z.string().url().optional().or(z.literal("")),
  orgLocation: z.string().optional(),
  establishedYear: z.string().optional(),
});

export const festivalSchema = festivalStep1Schema.merge(festivalStep2Schema);

export type FestivalStep1Data = z.infer<typeof festivalStep1Schema>;
export type FestivalStep2Data = z.infer<typeof festivalStep2Schema>;
export type FestivalFormData = z.infer<typeof festivalSchema>;
