import { z } from "zod";

export const categorySchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(["SINGLE", "GENERAL"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createCategoryInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["SINGLE", "GENERAL"]).default("SINGLE"),
});

export const updateCategoryInput = createCategoryInput.partial();

export type Category = z.infer<typeof categorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategoryInput>;
export type UpdateCategoryInput = z.infer<typeof updateCategoryInput>;
