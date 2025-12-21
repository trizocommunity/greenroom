import { notFound } from "next/navigation";
import { FeaturedPrograms } from "@/components/festival/landing/FeaturedPrograms";
import { GalleryPreview } from "@/components/festival/landing/GalleryPreview";
import { HeroSection } from "@/components/festival/landing/HeroSection";
import { ResultsTeaser } from "@/components/festival/landing/ResultsTeaser";
import { StatsSection } from "@/components/festival/landing/StatsSection";
import { findFestivalById } from "@/server/models/festival.model";

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalId } = await params;
  const festival = await findFestivalById(festivalId);

  if (!festival) {
    notFound();
  }

  // Transform for client component
  const festivalData = {
    id: festival.id,
    name: festival.name,
    slug: festival.id,
    description: "",
    tagline: "",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    location: "",
    status: festival.status,
    accentColor: "#000000",
    activeEdition: null,
    logo: null,
    heroImage: null,
    orgName: "",
    orgDescription: "",
    orgWebsite: "",
    orgLocation: "",
    orgEstablishedYear: null,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection festival={festivalData} />
      <StatsSection accentColor={festivalData.accentColor} />

      {/* About Section */}
      {festivalData.description && (
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
              {festivalData.description}
            </p>
          </div>
        </section>
      )}

      <FeaturedPrograms
        accentColor={festivalData.accentColor}
        slug={festivalData.slug}
      />
      <ResultsTeaser
        accentColor={festivalData.accentColor}
        slug={festivalData.slug}
      />
      <GalleryPreview slug={festivalData.slug} />
    </div>
  );
}
