import { z } from "zod";

export const galleryImageSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  url: z.string(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createGalleryImageInput = z.object({
  festivalId: z.string(),
  url: z.string(),
});

export const createManyGalleryImagesInput = z.object({
  festivalId: z.string(),
  urls: z.array(z.string()),
});

export const updateGalleryImageInput = z.object({
  festivalId: z.string(),
  imageId: z.string(),
  url: z.string().optional(),
});

export const deleteGalleryImageInput = z.object({
  festivalId: z.string(),
  imageId: z.string(),
});

export const deleteManyGalleryImagesInput = z.object({
  festivalId: z.string(),
  imageIds: z.array(z.string()),
});

export const reorderGalleryInput = z.object({
  festivalId: z.string(),
  imageIds: z.array(z.string()),
});

export type GalleryImage = z.infer<typeof galleryImageSchema>;
export type CreateGalleryImageInput = z.infer<typeof createGalleryImageInput>;
export type CreateManyGalleryImagesInput = z.infer<
  typeof createManyGalleryImagesInput
>;
export type UpdateGalleryImageInput = z.infer<typeof updateGalleryImageInput>;
export type DeleteGalleryImageInput = z.infer<typeof deleteGalleryImageInput>;
export type DeleteManyGalleryImagesInput = z.infer<
  typeof deleteManyGalleryImagesInput
>;
export type ReorderGalleryInput = z.infer<typeof reorderGalleryInput>;
