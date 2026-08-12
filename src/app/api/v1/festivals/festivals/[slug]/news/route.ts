import { notFound, ok } from "@/api/lib/response";
import {
  PUBLIC_CACHE_CONTROL,
  readPageParams,
  resolvePublicFestival,
} from "@/features/festivals/services/public-api-access.service";
import {
  getPublicNewsData,
  PUBLIC_NEWS_PAGE_SIZE,
} from "@/features/news/loaders/news-public.loader";

/** Paginated published news posts, newest first. `?page=2&pageSize=10` */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const access = await resolvePublicFestival(slug, "news");
  if (!access.ok) {
    return notFound("NEWS_NOT_FOUND", "Festival news not available");
  }

  const { page, pageSize } = readPageParams(request, {
    pageSize: PUBLIC_NEWS_PAGE_SIZE,
    maxPageSize: 50,
  });

  const data = await getPublicNewsData(slug, { page, pageSize });
  if (!data) {
    return notFound("NEWS_NOT_FOUND", "Festival news not available");
  }

  // The festival record is already on the page that called this; only the
  // posts and the cursor need to travel.
  return ok(
    {
      posts: data.posts,
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      hasMore: data.hasMore,
    },
    PUBLIC_CACHE_CONTROL,
  );
}
