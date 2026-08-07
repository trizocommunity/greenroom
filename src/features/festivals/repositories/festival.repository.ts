import { and, count, desc, eq, exists, type SQL, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import { withDbRetry } from "@/core/database/db-retry";
import {
  category as categories,
  festival as festivals,
  group as groups,
  judge as judges,
  festivalMember as members,
  participant as participants,
  programmeAssignment,
  programme as programmes,
  result as results,
  festivalScoringPolicy as scoringPolicies,
  stage as stages,
} from "@/core/database/schema";
import { isAfter, parseInstant } from "@/core/datetime";
import { serverNowIso } from "@/core/datetime/server";

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
      updatedAt: data.updatedAt ?? serverNowIso(),
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

/** Owner row for festival queries — never load password into app memory. */
const festivalOwnerUserColumns = {
  columns: {
    id: true,
    email: true,
    fullName: true,
    displayName: true,
    globalRole: true,
    isActive: true,
    age: true,
    createdAt: true,
    updatedAt: true,
  },
} as const;

async function attachProgrammeAndParticipantCounts<T extends { id: string }>(
  row: T,
) {
  const [progRow, studRow] = await Promise.all([
    db
      .select({ n: count() })
      .from(programmes)
      .where(eq(programmes.festivalId, row.id)),
    db
      .select({ n: count() })
      .from(participants)
      .where(eq(participants.festivalId, row.id)),
  ]);

  return {
    ...row,
    _count: {
      programmes: Number(progRow[0]?.n ?? 0),
      participants: Number(studRow[0]?.n ?? 0),
    },
  };
}

export async function findFestivalBySlugOrId(slugOrId: string) {
  return withDbRetry(async () => {
    const bySlug = await db.query.festival.findFirst({
      where: eq(festivals.slug, slugOrId),
      with: { user: festivalOwnerUserColumns },
    });

    if (bySlug) {
      return attachProgrammeAndParticipantCounts(bySlug);
    }

    const byId = await db.query.festival.findFirst({
      where: eq(festivals.id, slugOrId),
      with: { user: festivalOwnerUserColumns },
    });

    if (byId) {
      return attachProgrammeAndParticipantCounts(byId);
    }
    return null;
  });
}

export async function updateTeamStandings(festivalId: string, standings: any) {
  const result = await db
    .update(festivals)
    .set({ teamStandings: standings })
    .where(eq(festivals.id, festivalId))
    .returning();
  return result[0];
}

export async function updateFestivalStandings(
  festivalId: string,
  data: {
    teamStandings?: unknown;
    standingsPublishedAtResultNumber?: number | null;
    standingsPublishedAt?: string | null;
  },
) {
  const result = await db
    .update(festivals)
    .set({
      ...data,
      updatedAt: serverNowIso(),
    })
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
  const withResult = assignments.filter((a) => a.result?.isPublished);
  if (withResult.length === 0) return [];

  if (programme.type === "GROUP") {
    const teamMap = new Map<string, any>();
    withResult.forEach((assignment) => {
      const result = assignment.result;
      const teamId = getTeamIdentifier(assignment);
      if (!teamMap.has(teamId)) {
        const displayName = `${assignment.participant?.name || "Unknown"} and team`;
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
    const result = assignment.result;
    return {
      displayName: assignment.participant?.name || "Unknown",
      subText: "",
      chestNumber: assignment.participant?.chestNumber
        ? `#${assignment.participant.chestNumber}`
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
    tc,
    tst,
    fest,
    progActive,
    progFinal,
    participantsByTeamRaw,
    participantsByCategoryRaw,
    jCount,
    scoringPoliciesCount,
    chestNumbersCount,
    offStageCount,
    staffCount,
  ] = await Promise.all([
    db
      .select({ c: count() })
      .from(programmes)
      .where(eq(programmes.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(participants)
      .where(eq(participants.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(groups)
      .where(eq(groups.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(categories)
      .where(eq(categories.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(stages)
      .where(eq(stages.festivalId, festivalId)),
    db.query.festival.findFirst({
      where: eq(festivals.id, festivalId),
      columns: { judgesCount: true, teamStandings: true },
    }),
    db
      .select({ c: count() })
      .from(programmes)
      .where(
        and(
          eq(programmes.festivalId, festivalId),
          eq(programmes.status, "PENDING_JUDGMENT"),
        ),
      ),
    db
      .select({ c: count() })
      .from(programmes)
      .where(
        and(
          eq(programmes.festivalId, festivalId),
          eq(programmes.status, "PUBLISHED"),
        ),
      ),
    db
      .select({
        name: groups.name,
        count: count(participants.id),
      })
      .from(groups)
      .leftJoin(participants, eq(participants.groupId, groups.id))
      .where(eq(groups.festivalId, festivalId))
      .groupBy(groups.name),
    db
      .select({
        name: categories.name,
        type: categories.type,
        count: count(participants.id),
      })
      .from(categories)
      .leftJoin(participants, eq(participants.categoryId, categories.id))
      .where(eq(categories.festivalId, festivalId))
      .groupBy(categories.name, categories.type),
    db
      .select({ c: count() })
      .from(judges)
      .where(eq(judges.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(scoringPolicies)
      .where(eq(scoringPolicies.festivalId, festivalId)),
    db
      .select({ c: count() })
      .from(participants)
      .where(
        and(
          eq(participants.festivalId, festivalId),
          sql`${participants.chestNumber} IS NOT NULL`,
        ),
      ),
    db
      .select({ c: count() })
      .from(stages)
      .where(
        and(eq(stages.festivalId, festivalId), eq(stages.isOffStage, true)),
      ),
    db
      .select({ c: count() })
      .from(members)
      .where(eq(members.festivalId, festivalId)),
  ]);

  return {
    totalProgrammes: tp[0].c,
    totalParticipants: ts[0].c,
    totalGroups: tg[0].c,
    totalCategories: tc[0].c,
    totalStages: tst[0].c,
    totalJudges: jCount[0].c,
    programmesActiveCount: progActive[0].c,
    programmesFinalCount: progFinal[0].c,
    participantsByTeam: participantsByTeamRaw,
    participantsByCategory: participantsByCategoryRaw,
    teamStandings: fest?.teamStandings,

    // Fest Setup Flags
    hasProgrammes: tp[0].c > 0,
    hasScoringPolicy: scoringPoliciesCount[0].c > 0,
    hasParticipants: ts[0].c > 0,
    hasChestNumbers: chestNumbersCount[0].c > 0,
    hasSchedule: tst[0].c > 0, // A stage is required for scheduling
    hasOffStageTasks: offStageCount[0].c > 0,
    hasStaff: staffCount[0].c > 0,
  };
}

export async function getFestivalAnalyticsData(festivalId: string) {
  const [sc, pc, gc, stc, rc, prc, cc, fest] = await Promise.all([
    db
      .select({ c: count() })
      .from(participants)
      .where(eq(participants.festivalId, festivalId)),
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
    participantsCount: sc[0].c,
    programmesCount: pc[0].c,
    groupsCount: gc[0].c,
    stagesCount: stc[0].c,
    resultsCount: rc[0].c,
    publishedResultsCount: prc[0].c,
    categoriesCount: cc[0].c,
    judgesCount: fest?.judgesCount ?? 0,
  };
}
