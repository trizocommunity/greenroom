import { asc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  festival as festivalTable,
  festivalMediaImage as mediaImageTable,
} from "@/core/database/schema";

export type PublicMediaData = {
  festival: { id: string; name: string; slug: string };
  images: { id: string; url: string; order: number }[];
};

export async function getPublicMediaData(
  festivalSlug: string,
): Promise<PublicMediaData | null> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: { id: true, name: true, slug: true },
  });
  if (!festival) return null;

  const images = await db.query.festivalMediaImage.findMany({
    where: eq(mediaImageTable.festivalId, festival.id),
    orderBy: [asc(mediaImageTable.order)],
    columns: { id: true, url: true, order: true },
  });

  return { festival, images };
}
