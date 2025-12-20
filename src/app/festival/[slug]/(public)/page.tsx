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
        <section className="py-24 px-4 bg-background border-t border-white/10 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/5 to-transparent blur-3xl -z-10" />
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <span className="text-sm font-bold tracking-widest text-primary uppercase">
              About the Event
            </span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-foreground">
              A Celebration of Culture
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
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
