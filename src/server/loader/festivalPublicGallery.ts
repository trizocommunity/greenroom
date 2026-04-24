import { db } from "@/lib/db";
import { festival as festivalTable, festivalGalleryImage as galleryImageTable } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";

export type PublicGalleryData = {
  festival: { id: string; name: string; slug: string };
  images: { id: string; url: string; order: number }[];
};

export async function getPublicGalleryData(
  festivalSlug: string,
): Promise<PublicGalleryData | null> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true, name: true, slug: true },
  });
  if (!festival) return null;

  const images = await db.query.festivalGalleryImage.findMany({
    where: eq(galleryImageTable.festivalId, festival.id),
    orderBy: [asc(galleryImageTable.order)],
    columns: { id: true, url: true, order: true },
  });

  return { festival, images };
}
