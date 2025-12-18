import { notFound } from "next/navigation";
import { FeaturedPrograms } from "@/components/festival/landing/FeaturedPrograms";
import { GalleryPreview } from "@/components/festival/landing/GalleryPreview";
import { HeroSection } from "@/components/festival/landing/HeroSection";
import { ResultsTeaser } from "@/components/festival/landing/ResultsTeaser";
import { StatsSection } from "@/components/festival/landing/StatsSection";
import { findFestivalBySlugWithCounts } from "@/server/models/festival.model";

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await findFestivalBySlugWithCounts(slug);

  if (!festival) {
    notFound();
  }

  // Transform for client component
  const festivalData = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug!,
    description: festival.description,
    tagline: festival.tagline,
    startDate: festival.startDate.toISOString(),
    endDate: festival.endDate.toISOString(),
    location: festival.location,
    status: festival.status,
    accentColor: festival.accentColor,
    logo: festival.logo,
    heroImage: festival.heroImage,
    orgName: festival.orgName,
    orgDescription: festival.orgDescription,
    orgWebsite: festival.orgWebsite,
    orgLocation: festival.orgLocation,
    orgEstablishedYear: festival.orgEstablishedYear,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection festival={festivalData} />
      <StatsSection accentColor={festival.accentColor} />

      {/* About Section */}
      {festival.description && (
        <section className="py-24 px-4 bg-muted/20">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              About the Event
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              A Celebration of Culture
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {festival.description}
            </p>
          </div>
        </section>
      )}

      <FeaturedPrograms
        accentColor={festival.accentColor}
        slug={festival.slug!}
      />
      <ResultsTeaser accentColor={festival.accentColor} slug={festival.slug!} />
      <GalleryPreview slug={festival.slug!} />
    </div>
  );
}
