import { z } from "zod";

export const downloadFileTypeSchema = z.enum([
  "PDF",
  "DOC",
  "XLS",
  "JPG",
  "PNG",
  "ZIP",
  "OTHER",
]);

export const downloadCategorySchema = z.enum([
  "SCHEDULE",
  "RULES",
  "FORMS",
  "BROCHURE",
  "RESULTS",
  "OTHER",
]);

export const downloadSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  fileUrl: z.string(),
  fileType: downloadFileTypeSchema,
  category: downloadCategorySchema,
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createDownloadInput = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  fileUrl: z.string(),
  fileType: downloadFileTypeSchema,
  category: downloadCategorySchema,
  publishedAt: z.string().nullable().optional(),
});

export const updateDownloadInput = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  fileUrl: z.string().optional(),
  fileType: downloadFileTypeSchema.optional(),
  category: downloadCategorySchema.optional(),
  publishedAt: z.string().nullable().optional(),
});

export const deleteDownloadInput = z.object({
  festivalId: z.string(),
  downloadId: z.string(),
});

export type Download = z.infer<typeof downloadSchema>;
export type CreateDownloadInput = z.infer<typeof createDownloadInput>;
export type UpdateDownloadInput = z.infer<typeof updateDownloadInput>;
export type DeleteDownloadInput = z.infer<typeof deleteDownloadInput>;
export type DownloadFileType = z.infer<typeof downloadFileTypeSchema>;
export type DownloadCategory = z.infer<typeof downloadCategorySchema>;

/** Display order for categories on the public page. */
export const DOWNLOAD_CATEGORY_ORDER: DownloadCategory[] = [
  "SCHEDULE",
  "RULES",
  "FORMS",
  "BROCHURE",
  "RESULTS",
  "OTHER",
];

/** Human label for each enum value. */
export const DOWNLOAD_CATEGORY_LABELS: Record<DownloadCategory, string> = {
  SCHEDULE: "Schedule",
  RULES: "Rules & Syllabus",
  FORMS: "Forms",
  BROCHURE: "Brochure",
  RESULTS: "Results",
  OTHER: "Other",
};

/** Badge text for the file-type card. */
export const DOWNLOAD_FILE_TYPE_LABELS: Record<DownloadFileType, string> = {
  PDF: "PDF",
  DOC: "DOC",
  XLS: "XLS",
  JPG: "JPG",
  PNG: "PNG",
  ZIP: "ZIP",
  OTHER: "FILE",
};

/** Accent color for the file-type badge. */
export const DOWNLOAD_FILE_TYPE_COLORS: Record<DownloadFileType, string> = {
  PDF: "#E0533A",
  DOC: "#2B6CB0",
  XLS: "#1F8A4C",
  JPG: "#9333EA",
  PNG: "#9333EA",
  ZIP: "#6B7280",
  OTHER: "#6B7280",
};
