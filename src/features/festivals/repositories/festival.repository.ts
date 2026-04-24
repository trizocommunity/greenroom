import { and, count, desc, eq, exists, type SQL, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category as categories,
  festival as festivals,
  group as groups,
  programmeAssignment,
  programme as programmes,
  result as results,
  stage as stages,
  student as students,
} from "@/core/database/schema";

export async function findAllFestivals(
  where?: SQL,
  orderBy: "asc" | "desc" = "desc",
) {
  return db.query.festival.findMany({
    where,
    orderBy: orderBy === "desc" ? [desc(festivals.createdAt)] : undefined,
    with: { user: true },
  });
}

export async function findFestivalById(id: string) {
  return db.query.festival.findFirst({
    where: eq(festivals.id, id),
    with: { user: true },
  });
}

export async function findFestivalBySlug(slug: string) {
  return db.query.festival.findFirst({
    where: eq(festivals.slug, slug),
    with: { user: true },
  });
}

export async function createFestival(
  data: Omit<typeof festivals.$inferInsert, "id" | "updatedAt"> & {
    id?: string;
    updatedAt?: string;
  },
) {
  const { randomUUID } = await import("crypto");
  const result = await db
    .insert(festivals)
    .values({
      id: data.id ?? randomUUID(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      ...data,
    })
    .returning();
  return result[0];
}

export async function updateFestival(
  id: string,
  data: Partial<typeof festivals.$inferInsert>,
) {
  const result = await db
    .update(festivals)
    .set(data)
    .where(eq(festivals.id, id))
    .returning();
  return result[0];
}

export async function deleteFestival(id: string) {
  const result = await db
    .delete(festivals)
    .where(eq(festivals.id, id))
    .returning();
  return result[0];
}

export async function findFestivalByOwnerId(ownerId: string) {
  return db.query.festival.findFirst({
    where: eq(festivals.ownerId, ownerId),
    with: { user: true },
  });
}

export async function findFestivalBySlugOrId(slugOrId: string) {
  const bySlug = await db.query.festival.findFirst({
    where: eq(festivals.slug, slugOrId),
    with: {
      user: true,
      programmes: { columns: { id: true } },
      students: { columns: { id: true } },
    },
  });

  if (bySlug) {
    const { programmes: p, students: s, ...rest } = bySlug;
    return { ...rest, _count: { programmes: p.length, students: s.length } };
  }

  const byId = await db.query.festival.findFirst({
    where: eq(festivals.id, slugOrId),
    with: {
      user: true,
      programmes: { columns: { id: true } },
      students: { columns: { id: true } },
    },
  });

  if (byId) {
    const { programmes: p, students: s, ...rest } = byId;
    return { ...rest, _count: { programmes: p.length, students: s.length } };
  }
  return null;
}

export async function updateTeamStandings(festivalId: string, standings: any) {
  const result = await db
    .update(festivals)
    .set({ teamStandings: standings })
    .where(eq(festivals.id, festivalId))
    .returning();
  return result[0];
}

export type OverviewResultRow = {
  displayName: string;
  subText: string;
  chestNumber: string;
  grade: string | null;
  points: number;
  position: number;
};

export type OverviewProgrammeResults = {
  programme: {
    id: string;
    name: string;
    type: string;
    category: { id: string; name: string };
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
  assignments: Array<any>,
  maxRows: number,
): OverviewResultRow[] {
  const withResult = assignments.filter(
    (a) => a.results && a.results.length > 0 && a.results[0],
  );
  if (withResult.length === 0) return [];

  if (programme.type === "GROUP") {
    const teamMap = new Map<string, any>();
    withResult.forEach((assignment) => {
      const result = assignment.results[0];
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
    const result = assignment.results[0];
    return {
      displayName: assignment.student?.name || "Unknown",
      subText: "",
      chestNumber: assignment.student?.chestNumber
        ? `#${assignment.student.chestNumber}`
        : "",
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
    tp,
    ts,
    tg,
    recentProgrammes,
    recentStudents,
    programmesWithPublishedResults,
  ] = await Promise.all([
    db
      .select({ c: count() })
      .from(programmes)
      .where(eq(programmes.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(students)
      .where(eq(students.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(groups)
      .where(eq(groups.festivalId, festivalId)),
    db.query.programme.findMany({
      where: eq(programmes.festivalId, festivalId),
      orderBy: [desc(programmes.createdAt)],
      limit: 4,
      with: { category: true },
    }),
    db.query.student.findMany({
      where: eq(students.festivalId, festivalId),
      orderBy: [desc(students.createdAt)],
      limit: 6,
      with: { group: true },
    }),
    db.query.programme.findMany({
      where: and(
        eq(programmes.festivalId, festivalId),
        exists(
          db
            .select()
            .from(results)
            .where(
              and(
                eq(results.programmeId, programmes.id),
                eq(results.isPublished, true),
              ),
            ),
        ),
      ),
      limit: 4,
      with: {
        category: true,
        assignments: {
          with: {
            student: true,
            group: true,
            result: {
              where: eq(results.isPublished, true),
            },
          },
        },
      },
    }),
  ]);

  const recentResultsByProgramme: OverviewProgrammeResults[] =
    programmesWithPublishedResults.map((prog) => {
      const resultDates = prog.assignments
        .flatMap((a) => a.results)
        .map((r) => r?.createdAt)
        .filter((d): d is string => d != null)
        .map((d) => new Date(d));
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
    });

  return {
    totalProgrammes: tp[0].c,
    totalStudents: ts[0].c,
    totalGroups: tg[0].c,
    recentProgrammes,
    recentStudents,
    recentResultsByProgramme,
  };
}

export async function getFestivalAnalyticsData(festivalId: string) {
  const [sc, pc, gc, stc, rc, prc, cc, fest] = await Promise.all([
    db
      .select({ c: count() })
      .from(students)
      .where(eq(students.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(programmes)
      .where(eq(programmes.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(groups)
      .where(eq(groups.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(stages)
      .where(eq(stages.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(results)
      .innerJoin(programmes, eq(results.programmeId, programmes.id))
      .where(eq(programmes.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(results)
      .innerJoin(programmes, eq(results.programmeId, programmes.id))
      .where(
        and(
          eq(programmes.festivalId, festivalId),
          eq(results.isPublished, true),
        ),
      ),
    db
      .select({ c: count() })
      .from(categories)
      .where(eq(categories.festivalId, festivalId)),
    db.query.festival.findFirst({
      where: eq(festivals.id, festivalId),
      columns: { judgesCount: true },
    }),
  ]);

  return {
    studentsCount: sc[0].c,
    programmesCount: pc[0].c,
    groupsCount: gc[0].c,
    stagesCount: stc[0].c,
    resultsCount: rc[0].c,
    publishedResultsCount: prc[0].c,
    categoriesCount: cc[0].c,
    judgesCount: fest?.judgesCount ?? 0,
  };
}
