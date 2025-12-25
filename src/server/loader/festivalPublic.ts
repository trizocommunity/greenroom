import { prisma } from "@/lib/db";
import { EditionStatus, FestivalStatus } from "@prisma/client";

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
    status: FestivalStatus;
  };
  edition: {
    id: string;
    slug: string;
    status: EditionStatus;
    startDate: Date;
    endDate: Date;
    description: string | null;
    theme: string | null;
    venue: string | null;
    location: string | null;
    tierLabel: string;
  } | null;
  isHistoricalView: boolean;
  availableEditions: {
    id: string;
    slug: string;
    status: EditionStatus;
  }[];
};

export async function getPublicFestivalData(
  festivalSlug: string,
  editionIdentifier?: string | null,
): Promise<PublicFestivalData | null> {
  // 1. Fetch Festival
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
      isLocked: true,
    },
  });

  if (!festival) {
    return null;
  }

  // 2. Fetch All Public Editions (Active or Frozen) for History Selector
  // Exclude Drafts
  const publicEditions = await prisma.edition.findMany({
    where: {
      festivalId: festival.id,
      status: {
        in: [
          EditionStatus.ACTIVE,
          EditionStatus.FREEZE,
          EditionStatus.ARCHIVED,
        ],
      },
    },
    select: {
      id: true,
      status: true,
      slug: true,
    },
    orderBy: {
      startDate: "desc",
    },
  });

  // 3. Resolve Target Edition
  let targetEdition = null;
  let isHistoricalView = false;

  if (editionIdentifier) {
    // Treat identifier as slug directly
    targetEdition = await prisma.edition.findFirst({
      where: {
        festivalId: festival.id,
        slug: editionIdentifier,
        status: { not: EditionStatus.ARCHIVED }, // Same logic as before if desired
      },
      select: {
        id: true,
        slug: true,
        status: true,
        startDate: true,
        endDate: true,
        description: true,
        theme: true,
        venue: true,
        location: true,
        tierLabel: true,
      },
    });

    if (targetEdition) {
      isHistoricalView = true;
    }
  }

  // Automatic Resolution if no specific edition targeted found
  if (!targetEdition) {
    // Priority 1: ACTIVE Edition
    const activeEdition = await prisma.edition.findFirst({
      where: {
        festivalId: festival.id,
        status: EditionStatus.ACTIVE,
      },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        slug: true,
        status: true,
        startDate: true,
        endDate: true,
        description: true,
        theme: true,
        venue: true,
        location: true,
        tierLabel: true,
      },
    });

    if (activeEdition) {
      targetEdition = activeEdition;
      isHistoricalView = false;
    } else {
      // Priority 2: Latest FROZEN Edition
      const latestFrozen = await prisma.edition.findFirst({
        where: {
          festivalId: festival.id,
          status: EditionStatus.FREEZE,
        },
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          slug: true,
          status: true,
          startDate: true,
          endDate: true,
          description: true,
          theme: true,
          venue: true,
          location: true,
          tierLabel: true,
        },
      });
      if (latestFrozen) {
        targetEdition = latestFrozen;
        isHistoricalView = true;
      }
    }
  }

  return {
    festival,
    edition: targetEdition,
    isHistoricalView,
    availableEditions: publicEditions,
  };
}
