import { eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";

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
    branding: any;
    status: "READY" | "ONGOING" | "PAST" | "EXPIRED";
    tier: "BASIC" | "STANDARD" | "PRO" | null;
    participantCreationDeadline: string | null;
    programmeAssignmentDeadline: string | null;
    scoringSystem: "POSITION_BASED" | "SCORE_BASED";
    teamStandings: any;
    publicDisplayMode: "programme_results" | "team_standings";
    announcerResultsPerStandings: number;
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
      participantCreationDeadline: true,
      programmeAssignmentDeadline: true,
      scoringSystem: true,
      teamStandings: true,
      publicDisplayMode: true,
      announcerResultsPerStandings: true,
    },
  });

  if (!festival) {
    return null;
  }

  const startDate = festival.createdAt;
  const endDate =
    festival.expiresAt ||
    new Date(
      new Date(festival.createdAt).getTime() + 40 * 24 * 60 * 60 * 1000,
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
