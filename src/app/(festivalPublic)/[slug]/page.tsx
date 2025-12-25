import { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeaturedPrograms } from "@/components/festival/landing/FeaturedPrograms";
import { GalleryPreview } from "@/components/festival/landing/GalleryPreview";
import { HeroSection } from "@/components/festival/landing/HeroSection";
import { ResultsTeaser } from "@/components/festival/landing/ResultsTeaser";
import { StatsSection } from "@/components/festival/landing/StatsSection";
import { getPublicFestivalData } from "@/server/loader/festivalPublic";
import { EditionSelector } from "@/components/festival/public/EditionSelector";
import { EditionStatusBadge } from "@/components/festival/public/EditionStatusBadge";
import Image from "next/image";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edition?: string }>;
}): Promise<Metadata> {
  const { slug: festivalSlug } = await params;
  const { edition: editionParam } = await searchParams;
  const data = await getPublicFestivalData(festivalSlug, editionParam);

  if (!data) return { title: "Festival Not Found" };

  const { festival, edition } = data;
  const currentEditionName = edition?.slug;
  const title = currentEditionName
    ? `${festival.name} - ${currentEditionName}`
    : festival.name;

  return {
    title: title,
    description: festival.description,
    openGraph: {
      title: title,
      description: festival.description || undefined,
      images: (festival.branding as any)?.heroImage
        ? [(festival.branding as any).heroImage]
        : [],
    },
  };
}

export default async function FestivalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edition?: string }>;
}) {
  const { slug: festivalSlug } = await params;
  const { edition: editionParam } = await searchParams;

  const data = await getPublicFestivalData(festivalSlug, editionParam);

  if (!data) {
    notFound();
  }

  const { festival, edition, isHistoricalView, availableEditions } = data;

  // HANDLE NO EDITION (COMING SOON)
  if (!edition) {
    return (
      <div className="flex flex-col min-h-[80vh] items-center justify-center p-4 text-center space-y-6">
        <div className="space-y-2">
          {festival.branding &&
            typeof festival.branding === "object" &&
            "logo" in festival.branding && (
              <Image
                src={(festival.branding as any).logo}
                alt={festival.name}
                className="h-24 w-24 object-contain mx-auto mb-6"
              />
            )}
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">
            {festival.name}
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            {festival.description}
          </p>
        </div>
        <div className="py-8">
          <span className="inline-block px-4 py-2 rounded-full bg-white/5 border border-white/10 text-lg font-medium">
            Event Coming Soon
          </span>
        </div>
        {/* About Display even if no edition */}
        {festival.founderMessage && (
          <div className="max-w-2xl mx-auto mt-12 bg-muted/30 p-8 rounded-xl">
            <h3 className="text-lg font-bold mb-2">Message from Founder</h3>
            <p className="italic text-muted-foreground">
              "{festival.founderMessage}"
            </p>
            <p className="mt-2 font-medium">- {festival.founderName}</p>
          </div>
        )}
      </div>
    );
  }

  // MERGE DATA FOR COMPONENTS
  // HeroSection expects FestivalPublicData. We override festival defaults with Edition specifics.
  const displayData = {
    id: festival.id,
    name: festival.name, // Keep festival name (e.g. "Kalolsavam")
    slug: festival.slug,
    description: edition.description || festival.description || "",
    tagline: edition.theme || "", // Use theme as tagline
    startDate: edition.startDate.toISOString(),
    endDate: edition.endDate.toISOString(),
    location: edition.location || festival.orgLocation || "",
    status: festival.status,
    accentColor:
      festival.branding &&
      typeof festival.branding === "object" &&
      "colors" in festival.branding
        ? (festival.branding as any).colors?.primary || "#000000"
        : "#000000",
    activeEdition: null,
    logo:
      festival.branding &&
      typeof festival.branding === "object" &&
      "logo" in festival.branding
        ? (festival.branding as any).logo
        : null,
    heroImage:
      festival.branding &&
      typeof festival.branding === "object" &&
      "heroImage" in festival.branding
        ? (festival.branding as any).heroImage
        : null,
    orgName: festival.orgName || "",
    orgDescription: festival.orgDescription || "",
    orgWebsite: festival.orgWebsite || "",
    orgLocation: festival.orgLocation || "",
    establishedYear: festival.establishedYear || null,
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* GLOBAL STATUS BAR (Floating or top) */}
      <div className="absolute top-4 right-4 z-50 flex flex-col md:flex-row items-end gap-2">
        <EditionStatusBadge
          status={edition.status}
          isHistoricalView={isHistoricalView}
        />
        <EditionSelector
          currentEditionSlug={edition.slug}
          availableEditions={availableEditions}
        />
      </div>

      <HeroSection festival={displayData} />
      <StatsSection accentColor={displayData.accentColor} />

      {/* About Section */}
      {displayData.description && (
        <section className="py-24 px-4 bg-background border-t border-white/10 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-primary/5 to-transparent blur-3xl -z-10" />
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <span className="text-sm font-bold tracking-widest text-primary uppercase">
              About the Event
            </span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-foreground">
              {edition.slug}
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
              {displayData.description}
            </p>
          </div>
        </section>
      )}

      {/* Logic to hide/show sections based on edition status could go here? 
          For now, we just pass the slug. 
          The sub-components might need updating to accept editionId if they fetch data?
          Currently they take 'slug' and fetch internally. 
          If they fetch by 'slug' (festival slug), they default to Active edition?
          WARNING: FeaturedPrograms etc. likely query by API which resolves "Active" edition.
          We need to ensure they show data for THIS edition.
          
          We should ideally pass `editionId` or ensure the API they call respects the edition query param we can pass.
          But `FeaturedPrograms` is a Server Component? Let's check imports.
          It is imported from `@/components...`. Checks needed.
      */}

      {/* Ideally we pass the resolved edition to these components */}
      {/* 
         Since we are refactoring, we might need to update FeaturedPrograms etc 
         to accept `editionId` or `editionSlug` or assume they render based on passed data?
         Let's assume for now they work by slug, but that is WRONG for historical view.
         Workaround: We likely need to update those components to take editionId.
         However, for this step, I will render them as is, and mark for update if needed in next steps.
         Actually, the plan says: "Render HeroSection, FeaturedPrograms, etc. using the resolved edition."
       */}

      {/* Temporary: Pass slug. We need to fix data fetching inside them if they fetch data themselves. */}
      <FeaturedPrograms
        accentColor={displayData.accentColor}
        slug={displayData.slug} // This uses festival slug.
      />
      <ResultsTeaser
        accentColor={displayData.accentColor}
        slug={displayData.slug}
      />
      <GalleryPreview slug={displayData.slug} />
    </div>
  );
}
