import { z } from "zod";
import { InstitutionType } from "@/lib/app-enums";

export const createFestivalSchema = z
  .object({
    paymentId: z.string().uuid(),
    festivalName: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(50),
    festivalSlug: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes")
      .optional()
      .or(z.literal("")),
    institutionType: z.nativeEnum(InstitutionType).optional(),
    institutionName: z.string().optional().or(z.literal("")),
    location: z.string().optional().or(z.literal("")),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine(
    (data) => {
      // end must be after or same as start
      return data.endDate >= data.startDate;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  );

export const updateFestivalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  orgName: z.string().optional().nullable(),
  orgDescription: z.string().optional().nullable(),
  orgWebsite: z
    .string()
    .url("Invalid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  orgLocation: z.string().optional().nullable(),
  establishedYear: z
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear())
    .optional()
    .nullable(),
  institutionType: z.nativeEnum(InstitutionType).optional().nullable(),
  institutionName: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  founderName: z.string().optional().nullable(),
  founderMessage: z.string().optional().nullable(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes")
    .optional(),
});

export type CreateFestivalInput = z.infer<typeof createFestivalSchema>;
export type UpdateFestivalInput = z.infer<typeof updateFestivalSchema>;

// Legacy compatibility if needed
export const festivalStep1Schema = z.object({
  name: z.string().min(2, "Festival name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  location: z.string().min(2, "Location is required"),
});
