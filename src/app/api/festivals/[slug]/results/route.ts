import { notFound, ok } from "@/api/lib/response";
import {
  getPublicProgrammeResults,
  PUBLIC_RESULTS_PAGE_SIZE,
} from "@/features/festivals/loaders/festival-results.loader";
import {
  PUBLIC_CACHE_CONTROL,
  readPageParams,
  resolvePublicFestival,
} from "@/features/festivals/services/public-api-access.service";

/**
 * Paginated announced results, grouped by programme.
 *
 * Query: `?page=1&pageSize=20&search=qiraath&type=INDIVIDUAL`
 *
 * Search and type filtering are handled here rather than on the client so a
 * visitor searching a 1,000-programme festival still only downloads a page.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const access = await resolvePublicFestival(slug);
  if (!access.ok) {
    return notFound("FESTIVAL_NOT_FOUND", "Festival not found");
  }

  const { page, pageSize } = readPageParams(request, {
    pageSize: PUBLIC_RESULTS_PAGE_SIZE,
    maxPageSize: 50,
  });

  const url = new URL(request.url);
  const rawType = url.searchParams.get("type");
  const type =
    rawType === "INDIVIDUAL" || rawType === "GROUP" ? rawType : "ALL";

  const data = await getPublicProgrammeResults(access.festival.id, {
    page,
    pageSize,
    search: url.searchParams.get("search") ?? undefined,
    type,
    programmeId: url.searchParams.get("programmeId") ?? undefined,
    publicDisplayMode:
      (access.festival.publicDisplayMode as
        | "programme_results"
        | "team_standings"
        | null) ?? "programme_results",
  });

  return ok(data, PUBLIC_CACHE_CONTROL);
}
