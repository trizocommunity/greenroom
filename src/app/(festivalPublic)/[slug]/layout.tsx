import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { FestivalNavbar } from "@/components/festival/FestivalNavbar";
import { UserTimezoneProviderClient } from "@/components/providers/user-timezone-provider-client";
import { isFestivalExpired } from "@/features/festivals/lib/festival-expiry";
import { findFestivalBySlugForPublic } from "@/features/festivals/repositories/festival.repository";
import { getBrandingFromJson } from "@/features/festivals/types/festival.types";

export default async function FestivalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: festivalSlug } = await params;
  const hdrs = await headers();
  const institutionId = hdrs.get("x-institution-id");

  const festival = await findFestivalBySlugForPublic(
    festivalSlug,
    institutionId,
  );

  if (!festival) {
    notFound();
  }

  const expired = isFestivalExpired(festival);

  // Expired festivals keep results/standings on the same public URL.
  // Offline (and not expired) → 404.
  if (!expired && !festival.publicSiteEnabled) {
    notFound();
  }

  const branding = getBrandingFromJson(festival.branding);

  const festivalData = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    description: festival.description || "",
    tagline: festival.tagline || "",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    location: festival.orgLocation || "",
    status: festival.status,
    logo: branding?.logo ?? null,
    orgName: festival.orgName || "",
    orgDescription: festival.orgDescription || "",
    orgWebsite: festival.orgWebsite || "",
    orgLocation: festival.orgLocation || "",
    establishedYear: festival.establishedYear || null,
    participantsCount: (festival as { participantsCount?: number })
      .participantsCount || 0,
    limits: null,
    participantCreationStartDate: festival.participantCreationStartDate,
    participantCreationDeadline: festival.participantCreationDeadline,
    programmeAssignmentStartDate: festival.programmeAssignmentStartDate,
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline,
    tier: festival.tier as string,
    isExpired: expired,
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
