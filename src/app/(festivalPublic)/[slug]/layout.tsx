import { notFound } from "next/navigation";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { FestivalNavbar } from "@/components/festival/FestivalNavbar";
import { ExpiredFestivalView } from "@/components/festival/public/ExpiredFestivalView";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { expiredFestivalResult as resultTable } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { findFestivalBySlug } from "@/server/models/festival.model";
import { getBrandingFromJson } from "@/types/festival";

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
    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(resultTable)
      .where(eq(resultTable.festivalId, festival.id));
    const count = Number(countResult.count);
    
    const hasSnapshot = count > 0;
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
    logo: branding?.logo ?? null,
    heroImage: branding?.heroImage ?? null,
    orgName: festival.orgName || "",
    orgDescription: festival.orgDescription || "",
    orgWebsite: festival.orgWebsite || "",
    orgLocation: festival.orgLocation || "",
    establishedYear: festival.establishedYear || null,
    studentsCount: (festival as any).studentsCount || 0,
    limits: null,
    studentCreationDeadline: festival.studentCreationDeadline,
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline,
    tier: festival.tier as any,
  };

  return (
    <FestivalProvider festival={festivalData as any}>
      <div className="min-h-screen flex flex-col">
        <FestivalNavbar festival={festivalData as any} isLoggedIn={isLoggedIn} />
        <main className="flex-1 pt-16">{children}</main>
        <FestivalFooter festival={festivalData as any} />
      </div>
    </FestivalProvider>
  );
}
