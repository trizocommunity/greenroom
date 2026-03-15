import { notFound } from "next/navigation";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { FestivalNavbar } from "@/components/festival/FestivalNavbar";
import { ExpiredFestivalView } from "@/components/festival/public/ExpiredFestivalView";
import { getBrandingFromJson } from "@/types/festival";
import { getSession } from "@/lib/auth/session";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { prisma } from "@/lib/db";

export default async function FestivalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalSlug } = await params;

  const festival = await findFestivalBySlug(festivalSlug);

  if (!festival) {
    notFound();
  }

  const isExpired =
    festival.status === "EXPIRED" ||
    (festival.expiresAt && new Date(festival.expiresAt) < new Date());

  // Expired: show locked "festival ended" view (no dashboard, no interactive pages)
  if (isExpired) {
    const hasSnapshot =
      (await prisma.expiredFestivalResult.count({
        where: { festivalId: festival.id },
      })) > 0;
    const hasPdf = !!festival.resultPdfUrl || hasSnapshot;
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

  // Public site disabled: return 404 so URL is not accessible
  if (!festival.publicSiteEnabled) {
    notFound();
  }

  // Check if user is logged in
  const session = await getSession();
  const isLoggedIn = !!session?.userId;

  const branding = getBrandingFromJson(festival.branding);

  // Transform for client component
  const festivalData = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    description: festival.description || "",
    tagline: "", // Feature coming later
    startDate: new Date().toISOString(), // Placeholder, page will override
    endDate: new Date().toISOString(), // Placeholder
    location: festival.orgLocation || "",
    status: festival.status,
    accentColor: branding?.colors?.primary ?? "#000000",
    logo: branding?.logo ?? null,
    heroImage: branding?.heroImage ?? null,
    orgName: festival.orgName || "",
    orgDescription: festival.orgDescription || "",
    orgWebsite: festival.orgWebsite || "",
    orgLocation: festival.orgLocation || "",
    establishedYear: festival.establishedYear || null,
    studentsCount: festival.studentsCount || 0,
    limits: null,
    studentCreationDeadline: festival.studentCreationDeadline,
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline,
    tier: festival.tier,
  };

  return (
    <FestivalProvider festival={festivalData}>
      <div className="min-h-screen flex flex-col">
        <FestivalNavbar festival={festivalData} isLoggedIn={isLoggedIn} />
        <main className="flex-1 pt-16">{children}</main>
        <FestivalFooter festival={festivalData} />
      </div>
    </FestivalProvider>
  );
}
