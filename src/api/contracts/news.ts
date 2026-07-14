import { z } from "zod";

export const newsPostSchema = z.object({
  id: z.string(),
  festivalId: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
  content: z.string(),
  imageUrl: z.string().nullable(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createNewsPostInput = z.object({
  title: z.string(),
  excerpt: z.string().nullable().optional(),
  content: z.string(),
  imageUrl: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
});

export const updateNewsPostInput = z.object({
  title: z.string().optional(),
  excerpt: z.string().nullable().optional(),
  content: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
});

export const deleteNewsPostInput = z.object({
  festivalId: z.string(),
  postId: z.string(),
});

export type NewsPost = z.infer<typeof newsPostSchema>;
export type CreateNewsPostInput = z.infer<typeof createNewsPostInput>;
export type UpdateNewsPostInput = z.infer<typeof updateNewsPostInput>;
export type DeleteNewsPostInput = z.infer<typeof deleteNewsPostInput>;
