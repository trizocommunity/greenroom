import { z } from "zod";

export const uploadFolderEnum = z.enum([
  "logo",
  "hero",
  "news",
  "gallery",
  "poster",
]);

export const uploadInput = z.object({
  file: z.string().regex(/^data:image\/(jpeg|png|gif|webp|svg\+xml);base64,/),
  folder: uploadFolderEnum,
});

export const uploadResponse = z.object({
  url: z.string(),
  publicId: z.string(),
});

export type UploadInput = z.infer<typeof uploadInput>;
export type UploadResponse = z.infer<typeof uploadResponse>;
export type UploadFolder = z.infer<typeof uploadFolderEnum>;
