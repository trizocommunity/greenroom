import { z } from "zod";

export const createGeneralEntryCategorySchema = z.object({
  festivalId: z.string(),
  name: z.string().min(1, "Name is required"),
});

export const updateGeneralEntryCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
});

export const generalEntryAwardInputSchema = z.object({
  groupId: z.string(),
  points: z.number(),
});

export const createGeneralEntrySchema = z.object({
  festivalId: z.string(),
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().nullable(),
  type: z.enum(["GENERAL", "PROGRAMME"]).default("GENERAL"),
  remarks: z.string().nullable().optional(),
  awards: z.array(generalEntryAwardInputSchema),
});

export const updateGeneralEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().nullable(),
  type: z.enum(["GENERAL", "PROGRAMME"]).default("GENERAL"),
  remarks: z.string().nullable().optional(),
  awards: z.array(generalEntryAwardInputSchema),
});
