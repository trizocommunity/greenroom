import { z } from "zod";

export const mediaImageSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  url: z.string(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createMediaImageInput = z.object({
  festivalId: z.string(),
  url: z.string(),
});

export const createManyMediaImagesInput = z.object({
  festivalId: z.string(),
  urls: z.array(z.string()),
});

export const updateMediaImageInput = z.object({
  festivalId: z.string(),
  imageId: z.string(),
  url: z.string().optional(),
});

export const deleteMediaImageInput = z.object({
  festivalId: z.string(),
  imageId: z.string(),
});

export const deleteManyMediaImagesInput = z.object({
  festivalId: z.string(),
  imageIds: z.array(z.string()),
});

export const reorderMediaInput = z.object({
  festivalId: z.string(),
  imageIds: z.array(z.string()),
});

export type MediaImage = z.infer<typeof mediaImageSchema>;
export type CreateMediaImageInput = z.infer<typeof createMediaImageInput>;
export type CreateManyMediaImagesInput = z.infer<
  typeof createManyMediaImagesInput
>;
export type UpdateMediaImageInput = z.infer<typeof updateMediaImageInput>;
export type DeleteMediaImageInput = z.infer<typeof deleteMediaImageInput>;
export type DeleteManyMediaImagesInput = z.infer<
  typeof deleteManyMediaImagesInput
>;
export type ReorderMediaInput = z.infer<typeof reorderMediaInput>;
