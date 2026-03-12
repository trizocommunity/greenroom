import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Phase 1 Festival Model

export async function findAllFestivals(
  where: Prisma.FestivalWhereInput = {},
  orderBy: Prisma.FestivalOrderByWithRelationInput = { createdAt: "desc" },
) {
  return prisma.festival.findMany({
    where,
    orderBy,
    include: { owner: true },
  });
}

export async function findFestivalById(id: string) {
  return prisma.festival.findUnique({
    where: { id },
    include: { owner: true },
  });
}

export async function findFestivalBySlug(slug: string) {
  return prisma.festival.findUnique({
    where: { slug },
    include: { owner: true },
  });
}

export async function createFestival(data: Prisma.FestivalCreateInput) {
  return prisma.festival.create({
    data,
  });
}

export async function updateFestival(
  id: string,
  data: Prisma.FestivalUpdateInput,
) {
  return prisma.festival.update({
    where: { id },
    data,
  });
}

export async function deleteFestival(id: string) {
  return prisma.festival.delete({
    where: { id },
  });
}

// Helper to check if a user already owns a festival
export async function findFestivalByOwnerId(ownerId: string) {
  return prisma.festival.findUnique({
    where: { ownerId },
    include: { owner: true },
  });
}

export async function findFestivalBySlugOrId(slugOrId: string) {
  // Try slug first as it is more common in URLs now
  const bySlug = await prisma.festival.findUnique({
    where: { slug: slugOrId },
    include: {
      owner: true,
      _count: {
        select: {
          programmes: true,
          students: true,
        },
      },
    },
  });
  if (bySlug) return bySlug;

  // Fallback to ID
  return prisma.festival.findUnique({
    where: { id: slugOrId },
    include: {
      owner: true,
      _count: {
        select: {
          programmes: true,
          students: true,
        },
      },
    },
  });
}

export async function updateTeamStandings(
  festivalId: string,
  standings: Prisma.InputJsonValue,
) {
  return prisma.festival.update({
    where: { id: festivalId },
    data: {
      teamStandings: standings,
    },
  });
}

/** One row in the overview "Recent Results" per programme (student or team). */
export type OverviewResultRow = {
  displayName: string;
  subText: string;
  chestNumber: string;
  grade: string | null;
  points: number;
  position: number;
};

/** Programme with its result rows for Overview Recent Results (priority: programme, then student/teams). */
export type OverviewProgrammeResults = {
  programme: {
    id: string;
    name: string;
    type: string;
    category: { id: string; name: string };
    /** Latest published result date for this programme (for simple list). */
    latestResultAt: Date | null;
  };
  rows: OverviewResultRow[];
};

function getTeamIdentifier(assignment: {
  group?: { name: string } | null;
  teamNumber?: number | null;
}): string {
  const groupName = assignment.group?.name || "No Group";
  const teamNum = assignment.teamNumber ?? 1;
  return `${groupName}-${teamNum}`;
}

function buildResultRowsForProgramme(
  programme: { type: string },
  assignments: Array<{
    id: string;
    student?: { name: string | null; chestNumber: string | null } | null;
    group?: { name: string } | null;
    teamNumber?: number | null;
    result?: { grade: string | null; points: number; position: number | null } | null;
  }>,
  maxRows: number,
): OverviewResultRow[] {
  const withResult = assignments.filter((a) => a.result != null);
  if (withResult.length === 0) return [];

  if (programme.type === "GROUP") {
    const teamMap = new Map<
      string,
      { assignmentId: string; displayName: string; subText: string; grade: string | null; points: number; position: number }
    >();
    withResult.forEach((assignment) => {
      const result = assignment.result!;
      const teamId = getTeamIdentifier(assignment);
      if (!teamMap.has(teamId)) {
        const displayName = `${assignment.student?.name || "Unknown"} and team`;
        const groupName = assignment.group?.name || "";
        teamMap.set(teamId, {
          assignmentId: assignment.id,
          displayName,
          subText: groupName,
          grade: result.grade,
          points: result.points,
          position: result.position ?? 0,
        });
      }
    });
    return Array.from(teamMap.values())
      .sort((a, b) => {
        if (a.position && b.position) return a.position - b.position;
        return b.points - a.points;
      })
      .slice(0, maxRows)
      .map((r) => ({
        displayName: r.displayName,
        subText: r.subText,
        chestNumber: "",
        grade: r.grade,
        points: r.points,
        position: r.position,
      }));
  }

  const rows = withResult.map((assignment) => {
    const result = assignment.result!;
    return {
      displayName: assignment.student?.name || "Unknown",
      subText: "",
      chestNumber: assignment.student?.chestNumber ? `#${assignment.student.chestNumber}` : "",
      grade: result.grade,
      points: result.points,
      position: result.position ?? 0,
    };
  });
  rows.sort((a, b) => {
    if (a.position && b.position) return a.position - b.position;
    return b.points - a.points;
  });
  return rows.slice(0, maxRows);
}

export async function getDashboardOverviewData(festivalId: string) {
  const [
    totalProgrammes,
    totalStudents,
    totalGroups,
    recentProgrammes,
    recentStudents,
    programmesWithPublishedResults,
  ] = await Promise.all([
    prisma.programme.count({ where: { festivalId } }),
    prisma.student.count({ where: { festivalId } }),
    prisma.group.count({ where: { festivalId } }),
    prisma.programme.findMany({
      where: { festivalId },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { category: true },
    }),
    prisma.student.findMany({
      where: { festivalId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { group: true },
    }),
    prisma.programme.findMany({
      where: {
        festivalId,
        results: { some: { isPublished: true } },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      take: 4,
      include: {
        category: true,
        assignments: {
          where: { result: { isPublished: true } },
          include: {
            student: true,
            group: true,
            result: true,
          },
        },
      },
    }),
  ]);

  const recentResultsByProgramme: OverviewProgrammeResults[] = programmesWithPublishedResults.map(
    (prog) => {
      const resultDates = prog.assignments
        .map((a) => a.result?.createdAt)
        .filter((d): d is Date => d != null);
      const latestResultAt =
        resultDates.length > 0
          ? new Date(Math.max(...resultDates.map((d) => d.getTime())))
          : null;
      return {
        programme: {
          id: prog.id,
          name: prog.name,
          type: prog.type ?? "INDIVIDUAL",
          category: prog.category
            ? { id: prog.category.id, name: prog.category.name }
            : { id: "", name: "Uncategorized" },
          latestResultAt,
        },
        rows: buildResultRowsForProgramme(prog, prog.assignments, 5),
      };
    },
  );

  return {
    totalProgrammes,
    totalStudents,
    totalGroups,
    recentProgrammes,
    recentStudents,
    recentResultsByProgramme,
  };
}
