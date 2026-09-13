import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FestivalProvider } from "@/components/festival/FestivalContext";
import { ParticipantNavbar } from "@/components/participant/ParticipantNavbar";
import { CustomDomainProvider } from "@/components/providers/custom-domain-provider";
import { isCloudinaryUrl, resizeCloudinaryImage } from "@/core/integrations/cloudinary-transform";
import type { ProgrammeStatus } from "@/core/types/app-enums";
import { isFestivalExpired } from "@/features/festivals/lib/festival-expiry";
import { findFestivalBySlug } from "@/features/festivals/repositories/festival.repository";
import { getBrandingFromJson } from "@/features/festivals/types/festival.types";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const festival = await findFestivalBySlug(slug);
  if (!festival) return {};
  
  const branding = getBrandingFromJson(festival.branding);
  const fallbackColor = branding?.colors?.primary || "#d72626";
  const initials = ((festival.name || "GR").substring(0, 2)).toUpperCase();
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${fallbackColor}"/><text x="50" y="54" font-family="sans-serif" font-weight="bold" font-size="45" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  const fallbackIcon = `data:image/svg+xml;base64,${Buffer.from(fallbackSvg).toString("base64")}`;

  const rawLogo = branding?.logo ?? null;
  const resize = (size: number) =>
    rawLogo
      ? isCloudinaryUrl(rawLogo)
        ? resizeCloudinaryImage(rawLogo, { width: size, height: size })
        : rawLogo
      : fallbackIcon;

  const favicon32 = resize(32);
  const favicon180 = resize(180);

  return {
    title: {
      default: `Dashboard | ${festival.name}`,
      template: `%s | ${festival.name}`,
    },
    icons: {
      icon: [{ url: favicon32, sizes: "32x32", type: "image/png" }],
      apple: [{ url: favicon180, sizes: "180x180", type: "image/png" }],
      shortcut: favicon32,
    },
  };
}

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
  );
}
