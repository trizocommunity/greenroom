import { notFound } from "next/navigation";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { FestivalNavbar } from "@/components/festival/FestivalNavbar";
import { getSession } from "@/lib/auth/session";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { findEditionByFestivalAndSlug } from "@/server/models/edition.model";

export default async function PublicEditionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; editionSlug: string }>;
}) {
  const { slug, editionSlug } = await params;

  // 1. Fetch Festival
  const festival = await findFestivalBySlug(slug);
  if (!festival) return notFound();

  // 2. Fetch Edition
  const edition = await findEditionByFestivalAndSlug(festival.id, editionSlug);
  if (!edition) return notFound();

  // 3. Check Auth
  const session = await getSession();
  const isLoggedIn = !!session?.userId;

  // 4. Construct Context Data
  const festivalData = {
    ...festival,
    activeEdition: {
      id: edition.id,
      name: edition.name || `Edition ${edition.number}`,
      status: edition.status,
      participantsCount: 0,
      limits: edition.limits
        ? {
            maxParticipants: edition.limits.maxParticipants,
          }
        : null,
    },
    startDate: edition.startDate.toISOString(),
    endDate: edition.endDate.toISOString(),
    // Fallback for fields not yet in DB schema or used as defaults
    description: festival.description || "",
    tagline: "", // Schema update pending?
    location: "Campus Main Grounds",
    accentColor: "#000000",
    logo: null,
    heroImage: null,
    orgName: "Trizo",
    orgDescription: "",
    orgWebsite: "",
    orgLocation: "",
    establishedYear: null,
  };

  return (
    <FestivalProvider festival={festivalData}>
      <div className="min-h-screen flex flex-col">
        <FestivalNavbar
          festival={festivalData}
          isLoggedIn={isLoggedIn}
          currentEditionSlug={editionSlug}
        />
        <main className="flex-1 pt-16">{children}</main>
        <FestivalFooter festival={festivalData} />
      </div>
    </FestivalProvider>
  );
}
