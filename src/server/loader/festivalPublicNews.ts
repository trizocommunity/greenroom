import { prisma } from "@/lib/db";

export type PublicNewsPost = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  imageUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
};

export type PublicNewsData = {
  festival: { id: string; name: string; slug: string };
  posts: PublicNewsPost[];
};

export async function getPublicNewsData(
  festivalSlug: string,
): Promise<PublicNewsData | null> {
  const festival = await prisma.festival.findUnique({
    where: { slug: festivalSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!festival) return null;

  const posts = await prisma.festivalNews.findMany({
    where: {
      festivalId: festival.id,
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: "desc" },
    select: {
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
  const festival = await prisma.festival.findUnique({
    where: { slug: festivalSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!festival) return null;

  const post = await prisma.festivalNews.findFirst({
    where: {
      festivalId: festival.id,
      id: postId,
      publishedAt: { not: null },
    },
    select: {
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
