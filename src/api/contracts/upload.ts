import { z } from "zod";

export const uploadFolderEnum = z.enum([
  "logo",
  "hero",
  "news",
  "media",
  "poster",
]);

export const uploadInput = z.object({
  file: z
    .string()
    .regex(/^data:(image|video|application)\/[a-zA-Z0-9+.-]+;base64,/i),
  folder: uploadFolderEnum,
  festivalId: z.string(),
});

export const uploadResponse = z.object({
  url: z.string(),
  publicId: z.string(),
});

export type UploadInput = z.infer<typeof uploadInput>;
export type UploadResponse = z.infer<typeof uploadResponse>;
export type UploadFolder = z.infer<typeof uploadFolderEnum>;
