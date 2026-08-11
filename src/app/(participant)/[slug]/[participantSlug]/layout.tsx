import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { ParticipantNavbar } from "@/components/participant/ParticipantNavbar";
import { CustomDomainProvider } from "@/components/providers/custom-domain-provider";
import { UserTimezoneProviderClient } from "@/components/providers/user-timezone-provider-client";
import type { ProgrammeStatus } from "@/core/types/app-enums";
import { isFestivalExpired } from "@/features/festivals/lib/festival-expiry";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getFestivalLinkBase } from "@/features/institutions/lib/custom-domain";
import { findParticipantByFestivalAndProfileSlug } from "@/features/participants/repositories/participant.repository";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { getTopPriorityProgrammeStatus } from "@/features/programmes/services/programme-status-priority";

const RESERVED_SLUGS = new Set([
  "results",
  "media",
  "news",
  "programmes",
  "sessions",
  "about",
]);

export default async function ParticipantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string; participantSlug: string }>;
}) {
  const { slug, participantSlug } = await params;

  if (RESERVED_SLUGS.has(participantSlug)) notFound();

  const customDomain = (await headers()).get("x-custom-domain");

  const festival = await findFestivalBySlug(slug);
  if (!festival) notFound();

  if (isFestivalExpired(festival) || !festival.publicSiteEnabled) {
    notFound();
  }

  const canViewProfile = isEnabled(festival.tier, "publicParticipantProfile");
  if (!canViewProfile) notFound();

  const participant = await findParticipantByFestivalAndProfileSlug(
    festival.id,
    participantSlug,
  );
  if (!participant) notFound();

  const logo =
    festival.branding &&
    typeof festival.branding === "object" &&
    "logo" in festival.branding
      ? (festival.branding as any).logo
      : null;

  const festivalProviderValue = {
    id: festival.id,
    name: festival.name,
    slug: festival.slug,
    description: festival.description ?? null,
    tagline: null,
    startDate: festival.startDate ?? null,
    endDate: festival.endDate ?? null,
    location: festival.location ?? null,
    status: festival.status,
    tier: festival.tier,
    logo,
    orgName: festival.orgName ?? null,
    orgDescription: festival.orgDescription ?? null,
    orgWebsite: festival.orgWebsite ?? null,
    orgLocation: festival.orgLocation ?? null,
    establishedYear: festival.establishedYear ?? null,
    participantsCount: festival.participantsCount,
    programmesCount: festival.programmesCount,
    stagesCount: festival.stagesCount,
    limits: null,
    participantCreationStartDate: festival.participantCreationStartDate ?? null,
    participantCreationDeadline: festival.participantCreationDeadline ?? null,
    programmeAssignmentStartDate: festival.programmeAssignmentStartDate ?? null,
    programmeAssignmentDeadline: festival.programmeAssignmentDeadline ?? null,
    effectiveFeatures: undefined,
  } as any;

  const statuses: ProgrammeStatus[] = (participant.assignedProgrammes ?? [])
    .map((a: any) => a.programme?.status)
    .filter(Boolean);

  const assignedProgrammesTopStatus = participant.isTeamLeader
    ? null
    : (getTopPriorityProgrammeStatus(statuses) as ProgrammeStatus | null);

  const festivalBase = getFestivalLinkBase(
    festival.slug ?? slug,
    !!customDomain,
  );

  return (
    <UserTimezoneProviderClient festivalTimezone={festival.timezone ?? null}>
      <CustomDomainProvider customDomain={customDomain}>
        <FestivalProvider festival={festivalProviderValue}>
          <div className="min-h-screen md:pt-10">
            <ParticipantNavbar
              festival={{
                slug: festival.slug ?? slug,
                name: festival.name,
              }}
              participant={{
                id: participant.id,
                isTeamLeader: Boolean(participant.isTeamLeader),
                name: participant.name,
              }}
              participantSlugParam={participantSlug}
              participantMainHref={
                participant.isTeamLeader
                  ? `${festivalBase}/${participantSlug}/dashboard`
                  : `${festivalBase}/${participantSlug}`
              }
              assignedProgrammesTopStatus={assignedProgrammesTopStatus}
            />
            {children}
          </div>
        </FestivalProvider>
      </CustomDomainProvider>
    </UserTimezoneProviderClient>
  );
}
