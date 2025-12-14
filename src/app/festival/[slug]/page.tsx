import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FestivalHero } from "@/components/festival/FestivalHero";

async function getFestivalBySlug(slug: string) {
  const festival = await prisma.festival.findFirst({
    where: { slug },
    include: {
      _count: {
        select: {
          programs: true,
          teams: true,
        },
      },
    },
  });
  
  return festival;
}

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await getFestivalBySlug(slug);
  
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
    <div>
      <FestivalHero festival={festivalData} />
      
      {/* Festival Stats/Highlights */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card rounded-xl p-6 border text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: festival.accentColor }}
              >
                {festival._count.programs}
              </div>
              <p className="text-muted-foreground">Programs</p>
            </div>
            <div className="bg-card rounded-xl p-6 border text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: festival.accentColor }}
              >
                {festival._count.teams}
              </div>
              <p className="text-muted-foreground">Participating Teams</p>
            </div>
            <div className="bg-card rounded-xl p-6 border text-center">
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: festival.accentColor }}
              >
                {festival.status}
              </div>
              <p className="text-muted-foreground">Status</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* About Preview */}
      {festival.description && (
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">About the Festival</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {festival.description}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
