import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  festivalNews as newsTable,
} from "@/core/database/schema";

export type PublicNewsPost = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  imageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export type PublicNewsData = {
  festival: { id: string; name: string; slug: string };
  posts: PublicNewsPost[];
};

export async function getPublicNewsData(
  festivalSlug: string,
): Promise<PublicNewsData | null> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true, name: true, slug: true },
  });
  if (!festival) return null;

  const posts = await db.query.festivalNews.findMany({
    where: and(
      eq(newsTable.festivalId, festival.id),
      isNotNull(newsTable.publishedAt),
    ),
    orderBy: [desc(newsTable.publishedAt)],
    columns: {
      id: true,
      title: true,
      excerpt: true,
      content: true,
      imageUrl: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return { festival, posts: posts as PublicNewsPost[] };
}

export async function getPublicNewsPostBySlug(
  festivalSlug: string,
  postId: string,
): Promise<{
  festival: { name: string; slug: string };
  post: PublicNewsPost;
} | null> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true, name: true, slug: true },
  });
  if (!festival) return null;

  const post = await db.query.festivalNews.findFirst({
    where: and(
      eq(newsTable.festivalId, festival.id),
      eq(newsTable.id, postId),
      isNotNull(newsTable.publishedAt),
    ),
    columns: {
      id: true,
      title: true,
      excerpt: true,
      content: true,
      imageUrl: true,
      publishedAt: true,
      createdAt: true,
    },
  });
  if (!post) return null;

  return {
    festival: { name: festival.name, slug: festival.slug },
    post: post as PublicNewsPost,
  };
}
