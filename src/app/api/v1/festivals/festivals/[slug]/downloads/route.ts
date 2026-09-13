import { notFound, ok } from "@/api/lib/response";
import { getPublicDownloadsData } from "@/features/downloads/loaders/downloads-public.loader";
import {
  PUBLIC_CACHE_CONTROL,
  resolvePublicFestival,
} from "@/features/festivals/services/public-api-access.service";

/** Published downloads for the public page, grouped by category. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const access = await resolvePublicFestival(slug, "downloads");
  if (!access.ok) {
    return notFound("DOWNLOADS_NOT_FOUND", "Festival downloads not available");
  }

  const data = await getPublicDownloadsData(slug);
  if (!data) {
    return notFound("DOWNLOADS_NOT_FOUND", "Festival downloads not available");
  }

  return ok(
    {
      groups: data.groups,
      total: data.total,
    },
    PUBLIC_CACHE_CONTROL,
  );
}
