import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeaturedPrograms } from "@/components/festival/landing/FeaturedPrograms";
import { GalleryPreview } from "@/components/festival/landing/GalleryPreview";
import { HeroSection } from "@/components/festival/landing/HeroSection";
import { ResultsList } from "@/components/festival/landing/ResultsList";
import { ResultsTeaser } from "@/components/festival/landing/ResultsTeaser";
import { StatsSection } from "@/components/festival/landing/StatsSection";
import { getPublicFestivalData } from "@/features/festivals/loaders/festival-public.loader";
import { getPublicFestivalResults } from "@/features/festivals/loaders/festival-results.loader";
import { getPublicGalleryData } from "@/features/gallery/loaders/gallery-public.loader";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";
import { getResolvedTier } from "@/features/plan-features/services/tier";
import { findProgrammesByFestival } from "@/features/programmes/repositories/programme.repository";

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

  return {
    title: title,
    description: festival.description,
    openGraph: {
      title: title,
      description: festival.description || undefined,
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

  // ...
  const { festival, event } = data;

  // Check Feature Access
  const fullLandingPage = FeatureService.isFeatureEnabled(
    getTierForFeatureCheck(festival.tier),
    "fullLandingPage",
  );

  // HANDLE NO EVENT (Should be rare unless blocked)
  if (!event) {
    return (
      <div className="flex flex-col min-h-[80vh] items-center justify-center p-4 text-center space-y-6">
        <p>Event not active.</p>
      </div>
    );
  }

  // Fetch published results, programmes, and gallery for display
  const [publishedResults, programmes, galleryData] = await Promise.all([
    getPublicFestivalResults(festival.id, {
      publicDisplayMode: festival.publicDisplayMode ?? "programme_results",
    }),
    fullLandingPage
      ? findProgrammesByFestival(festival.id)
      : Promise.resolve([]),
    fullLandingPage
      ? getPublicGalleryData(festival.slug)
      : Promise.resolve(null),
  ]);

  // MERGE DATA FOR COMPONENTS
  const displayData = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    description: festival.description || "",
    tagline: "",
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location || festival.orgLocation || "",
    status: festival.status,
    tier: getResolvedTier(festival.tier),
    accentColor:
      festival.branding &&
      typeof festival.branding === "object" &&
      "colors" in festival.branding
        ? (festival.branding as any).colors?.primary || "#000000"
        : "#000000",

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
    studentCreationDeadline: festival.studentCreationDeadline,
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline,
  };
  return (
    <div className="flex flex-col min-h-screen relative">
      <HeroSection festival={displayData} basicMode={!fullLandingPage} />

      {fullLandingPage && (
        <StatsSection accentColor={displayData.accentColor} />
      )}

      {/* About Section */}
      {fullLandingPage && displayData.description && (
        <section className="py-16 md:py-20 px-4 bg-background border-t border-border">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <p className="text-eyebrow justify-center">About</p>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-heading">
              {festival.name}
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {displayData.description}
            </p>
          </div>
        </section>
      )}

      {fullLandingPage && programmes.length > 0 && (
        <FeaturedPrograms
          accentColor={displayData.accentColor}
          slug={displayData.slug}
          programmes={programmes}
        />
      )}

      <section id="results">
        {fullLandingPage ? (
          <ResultsTeaser
            accentColor={displayData.accentColor}
            slug={displayData.slug}
            results={publishedResults as any}
          />
        ) : (
          <ResultsList
            festivalName={displayData.name}
            festivalSlug={displayData.slug}
            accentColor={displayData.accentColor}
            results={publishedResults}
            teamStandings={festival.teamStandings as any}
          />
        )}
      </section>

      {fullLandingPage && galleryData && galleryData.images.length > 0 && (
        <GalleryPreview slug={displayData.slug} images={galleryData.images} />
      )}
    </div>
  );
}
