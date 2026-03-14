import { prisma } from "@/lib/db";

export type PublicGalleryData = {
  festival: { id: string; name: string; slug: string };
  images: { id: string; url: string; order: number }[];
};

export async function getPublicGalleryData(
  festivalSlug: string,
): Promise<PublicGalleryData | null> {
  const festival = await prisma.festival.findUnique({
    where: { slug: festivalSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!festival) return null;

  const images = await prisma.festivalGalleryImage.findMany({
    where: { festivalId: festival.id },
    orderBy: { order: "asc" },
    select: { id: true, url: true, order: true },
  });

  return { festival, images };
}
