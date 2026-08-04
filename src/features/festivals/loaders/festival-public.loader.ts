import { eq } from "drizzle-orm";
import { getFestivalDurationDays } from "@/config/pricing";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { MS } from "@/core/datetime/constants";

export type PublicFestivalData = {
  festival: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    tagline: string | null;
    orgName: string | null;
    orgDescription: string | null;
    orgWebsite: string | null;
    orgLocation: string | null;
    establishedYear: number | null;
    category: string | null;
    founderName: string | null;
    founderMessage: string | null;
    branding: any;
    status: "READY" | "ONGOING" | "PAST" | "EXPIRED";
    tier: "BASIC" | "STANDARD" | "PRO" | null;
    participantCreationStartDate: string | null;
    participantCreationDeadline: string | null;
    programmeAssignmentStartDate: string | null;
    programmeAssignmentDeadline: string | null;
    scoringSystem: "POSITION_BASED" | "SCORE_BASED";
    teamStandings: any;
  };
  event: {
    startDate: string;
    endDate: string;
    location: string | null;
    status: "READY" | "ONGOING" | "PAST" | "EXPIRED";
  } | null;
};

export async function getPublicFestivalData(
  festivalSlug: string,
): Promise<PublicFestivalData | null> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, festivalSlug),
    columns: {
      id: true,
      name: true,
      slug: true,
      description: true,
      tagline: true,
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
      participantCreationStartDate: true,
      participantCreationDeadline: true,
      programmeAssignmentStartDate: true,
      programmeAssignmentDeadline: true,
      scoringSystem: true,
      teamStandings: true,
    },
  });

  if (!festival) {
    return null;
  }

  const startDate = festival.createdAt;
  const endDate =
    festival.expiresAt ||
    new Date(
      new Date(festival.createdAt).getTime() +
        getFestivalDurationDays() * MS.day,
    ).toISOString();

  return {
    festival: festival as any,
    event: {
      startDate,
      endDate,
      location: festival.location || festival.orgLocation || null,
      status: festival.status,
    },
  };
}
