import { eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ExploreNav } from "@/components/festival/landing/ExploreNav";
import { HeroSection } from "@/components/festival/landing/HeroSection";
import { LatestWinners } from "@/components/festival/landing/LatestWinners";
import { MediaPreview } from "@/components/festival/landing/MediaPreview";
import { NewsPreview } from "@/components/festival/landing/NewsPreview";
import { ResultsList } from "@/components/festival/landing/ResultsList";
import { TeamStandingsSection } from "@/components/festival/landing/TeamStandingsSection";
import { ExpiredFestivalView } from "@/components/festival/public/ExpiredFestivalView";
import { db } from "@/core/database/client";
import { result as resultTable } from "@/core/database/schema";
import { isFestivalExpired } from "@/features/festivals/lib/festival-expiry";
import { getPublicFestivalData } from "@/features/festivals/loaders/festival-public.loader";
import {
  getPublicProgrammeResults,
  getPublicTopResults,
} from "@/features/festivals/loaders/festival-results.loader";
import { getFestivalLinkBase } from "@/features/institutions/lib/custom-domain";
import { getPublicMediaData } from "@/features/media/loaders/media-public.loader";
import { getPublicNewsData } from "@/features/news/loaders/news-public.loader";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { getResolvedTier } from "@/features/plan-features/services/tier";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: festivalSlug } = await params;
  const data = await getPublicFestivalData(festivalSlug);

  if (!data) return { title: "Festival Not Found" };

  const { festival } = data;
  const title = festival.name;
  const description = festival.tagline || festival.description || undefined;

  return {
    title: title,
    description,
    openGraph: {
      title: title,
      description,
      images: [],
    },
  };
}

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalSlug } = await params;

  const data = await getPublicFestivalData(festivalSlug);

  if (!data) {
    notFound();
  }

  const { festival, event } = data;
  // Branded hosts serve this page at `/`, so links must not repeat the slug.
  const linkBase = getFestivalLinkBase(
    festival.slug,
    !!(await headers()).get("x-custom-domain"),
  );

  if (isFestivalExpired(festival)) {
    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(resultTable)
      .where(eq(resultTable.festivalId, festival.id));
    const count = Number(countResult.count);
    const hasResults = count > 0;
    const hasPdf = !!festival.resultPdfUrl || hasResults;
    const downloadPdfUrl = festival.resultPdfUrl
      ? festival.resultPdfUrl
      : `/api/festivals/${festival.slug}/expired-results-pdf`;

    return (
      <ExpiredFestivalView
        festivalName={festival.name}
        festivalSlug={festival.slug}
        hasPdf={hasPdf}
        downloadPdfUrl={downloadPdfUrl}
      />
    );
  }

  // Check Feature Access
  const fullLandingPage = isEnabled(festival.tier, "fullLandingPage");

  // HANDLE NO EVENT (Should be rare unless blocked)
  if (!event) {
    return (
      <div className="flex flex-col min-h-[80vh] items-center justify-center p-4 text-center space-y-6">
        <p>Event not active.</p>
      </div>
    );
  }

  const [latestResults, mediaData, newsData, basicResults] = await Promise.all([
    getPublicTopResults(festival.id, { limit: 3 }),
    fullLandingPage
      ? getPublicMediaData(festival.slug, { page: 1, pageSize: 8 })
      : Promise.resolve(null),
    fullLandingPage
      ? getPublicNewsData(festival.slug, { page: 1, pageSize: 3 })
      : Promise.resolve(null),
    fullLandingPage
      ? Promise.resolve(null)
      : getPublicProgrammeResults(festival.id, { page: 1 }),
  ]);

  const accentColor =
    festival.branding &&
    typeof festival.branding === "object" &&
    "colors" in festival.branding
      ? (festival.branding as any).colors?.primary || "#000000"
      : "#000000";

  const displayData = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    description: festival.description || "",
    tagline: festival.tagline || "",
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location || festival.orgLocation || "",
    status: festival.status,
    tier: getResolvedTier(festival.tier),
    accentColor,
    logo:
      festival.branding &&
      typeof festival.branding === "object" &&
      "logo" in festival.branding
        ? (festival.branding as any).logo
        : null,
    orgName: festival.orgName || "",
    orgDescription: festival.orgDescription || "",
    orgWebsite: festival.orgWebsite || "",
    orgLocation: festival.orgLocation || "",
    establishedYear: festival.establishedYear || null,
    participantCreationStartDate: festival.participantCreationStartDate,
    participantCreationDeadline: festival.participantCreationDeadline,
    programmeAssignmentStartDate: festival.programmeAssignmentStartDate,
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline,
  };

  const teamStandings = (festival.teamStandings as any[]) ?? [];

  return (
    <div className="flex flex-col min-h-screen relative">
      <HeroSection
        festival={displayData}
        basicMode={!fullLandingPage}
        accentColor={accentColor}
      />

      {fullLandingPage ? (
        <>
          <TeamStandingsSection
            standings={teamStandings}
            accentColor={accentColor}
            viewAllHref={`${linkBase}/results`}
          />

          <LatestWinners
            slug={displayData.slug}
            results={latestResults}
            accentColor={accentColor}
          />

          {newsData && (
            <NewsPreview
              slug={displayData.slug}
              posts={newsData.posts}
              accentColor={accentColor}
            />
          )}

          {mediaData && mediaData.images.length > 0 && (
            <MediaPreview
              slug={displayData.slug}
              images={mediaData.images}
              accentColor={accentColor}
            />
          )}

          <ExploreNav slug={displayData.slug} accentColor={accentColor} />
        </>
      ) : (
        basicResults && (
          <div id="results">
            <ResultsList
              festivalName={displayData.name}
              festivalSlug={displayData.slug}
              festivalId={displayData.id}
              accentColor={accentColor}
              initialResults={basicResults}
              teamStandings={teamStandings}
            />
          </div>
        )
      )}
    </div>
  );
}
