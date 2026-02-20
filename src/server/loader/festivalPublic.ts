import type { FestivalStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type PublicFestivalData = {
  festival: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    orgName: string | null;
    orgDescription: string | null;
    orgWebsite: string | null;
    orgLocation: string | null;
    establishedYear: number | null;
    category: string | null;
    founderName: string | null;
    founderMessage: string | null;
    branding: import("@prisma/client").Prisma.JsonValue;
    status: FestivalStatus;
    tier: string | null;
    studentCreationDeadline: Date | null;
    programmeAssignmentDeadline: Date | null;
    scoringSystem: "POSITION_BASED" | "SCORE_BASED";
    teamStandings: import("@prisma/client").Prisma.JsonValue; // Using JSON type flexibility
  };
  // Simplified "Event" data (mapped from Festival)
  event: {
    startDate: Date;
    endDate: Date;
    location: string | null;
    status: FestivalStatus;
  } | null;
};

export async function getPublicFestivalData(
  festivalSlug: string,
): Promise<PublicFestivalData | null> {
  const festival = await prisma.festival.findUnique({
    where: { slug: festivalSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      orgName: true,
      orgDescription: true,
      orgWebsite: true,
      orgLocation: true,
      establishedYear: true,
      category: true,
      founderName: true,
      founderMessage: true,
      branding: true,
      status: true,
      tier: true,
      isLocked: true,
      createdAt: true,
      expiresAt: true,
      location: true,
      studentCreationDeadline: true,
      programmeAssignmentDeadline: true,
      scoringSystem: true,
      teamStandings: true,
    },
  });

  if (!festival) {
    return null;
  }

  // If DRAFT, perhaps hiding logic? Assuming logic handled upstream or allowed for preview.

  // Construct "Event" data from Festival
  const eventData = {
    startDate: festival.createdAt,
    endDate:
      festival.expiresAt ||
      new Date(festival.createdAt.getTime() + 40 * 24 * 60 * 60 * 1000), // Fallback if expiresAt missing
    location: festival.location || festival.orgLocation || null,
    status: festival.status,
  };

  return {
    festival,
    event: eventData,
  };
}
