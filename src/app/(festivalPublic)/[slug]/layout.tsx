import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { FestivalNavbar } from "@/components/festival/FestivalNavbar";
import { ExpiredFestivalView } from "@/components/festival/public/ExpiredFestivalView";
import { UserTimezoneProviderClient } from "@/components/providers/user-timezone-provider-client";
import { db } from "@/core/database/client";
import { result as resultTable } from "@/core/database/schema";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getBrandingFromJson } from "@/features/festivals/types/festival.types";

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

  // Public site disabled: return 404 so URL is not accessible
  if (!festival.publicSiteEnabled) {
    notFound();
  }

  const branding = getBrandingFromJson(festival.branding);

  // Transform for client component
  const festivalData = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    description: festival.description || "",
    tagline: festival.tagline || "",
    startDate: new Date().toISOString(), // Placeholder, page will override
    endDate: new Date().toISOString(), // Placeholder
    location: festival.orgLocation || "",
    status: festival.status,
    logo: branding?.logo ?? null,
    orgName: festival.orgName || "",
    orgDescription: festival.orgDescription || "",
    orgWebsite: festival.orgWebsite || "",
    orgLocation: festival.orgLocation || "",
    establishedYear: festival.establishedYear || null,
    participantsCount: (festival as any).participantsCount || 0,
    limits: null,
    participantCreationStartDate: festival.participantCreationStartDate,
    participantCreationDeadline: festival.participantCreationDeadline,
    programmeAssignmentStartDate: festival.programmeAssignmentStartDate,
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline,
    tier: festival.tier as any,
  };

  return (
    <UserTimezoneProviderClient festivalTimezone={festival.timezone ?? null}>
      <FestivalProvider festival={festivalData as any}>
        <div className="min-h-screen flex flex-col">
          <FestivalNavbar festival={festivalData as any} />
          <main className="flex-1 pt-16">{children}</main>
          <FestivalFooter festival={festivalData as any} />
        </div>
      </FestivalProvider>
    </UserTimezoneProviderClient>
  );
}
