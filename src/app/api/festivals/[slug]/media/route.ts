import { notFound, ok } from "@/api/lib/response";
import {
  PUBLIC_CACHE_CONTROL,
  readPageParams,
  resolvePublicFestival,
} from "@/features/festivals/services/public-api-access.service";
import {
  getPublicMediaData,
  PUBLIC_MEDIA_PAGE_SIZE,
} from "@/features/media/loaders/media-public.loader";

/** Paginated gallery images. `?page=2&pageSize=24` */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const access = await resolvePublicFestival(slug, "media");
  if (!access.ok) {
    return notFound("MEDIA_NOT_FOUND", "Festival media not available");
  }

  const { page, pageSize } = readPageParams(request, {
    pageSize: PUBLIC_MEDIA_PAGE_SIZE,
    maxPageSize: 60,
  });

  const data = await getPublicMediaData(slug, { page, pageSize });
  if (!data) {
    return notFound("MEDIA_NOT_FOUND", "Festival media not available");
  }

  // Videos only ship with page 1 — later pages are images only.
  return ok(
    {
      images: data.images,
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      hasMore: data.hasMore,
    },
    PUBLIC_CACHE_CONTROL,
  );
}
