import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programmeAssignmentMember as assignmentMemberTable,
  programmeAssignment as assignmentTable,
  category as categoryTable,
  participant as participantTable,
  programme as programmeTable,
  programmeTeamLead as programmeTeamLeadTable,
  result as resultTable,
} from "@/core/database/schema";

export interface PublicResult {
  id: string;
  programmeId: string;
  programName: string;
  programmeType: "INDIVIDUAL" | "GROUP";
  category: string;
  winner: string;
  team: string;
  position: number;
  points: number;
  awardPoints: number;
  grade?: string | null;
  codeLetter?: string | null;
  chestNo?: string | null;
  resultNumber?: number | null;
}

/** One programme with its announced results already sorted by position. */
export interface PublicProgrammeResults {
  id: string;
  name: string;
  category: string;
  type: "INDIVIDUAL" | "GROUP";
  resultNumber?: number | null;
  results: PublicResult[];
}

export interface PublicResultsPage {
  programmes: PublicProgrammeResults[];
  /** Total programmes matching the filters, not total result rows. */
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PublicResultsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: "ALL" | "INDIVIDUAL" | "GROUP";
  /**
   * Narrows to a single programme. Used by shared-poster deep links, where
   * the linked programme may sit on a page the visitor has not loaded.
   */
  programmeId?: string;
}

export const PUBLIC_RESULTS_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const EMPTY_PAGE = (page: number, pageSize: number): PublicResultsPage => ({
  programmes: [],
  total: 0,
  page,
  pageSize,
  hasMore: false,
});

/**
 * A page of announced results, grouped by programme.
 *
 * Pagination is by *programme*, not by result row — a programme's places only
 * make sense read together, so a page boundary must never fall inside one.
 * The programme page is resolved first (a cheap indexed query over `result`
 * joined to `programme`), and only that page's result rows are then loaded
 * with their assignment joins. That keeps a festival with 1,000 programmes
 * from pulling every row and every participant on first paint.
 */
export async function getPublicProgrammeResults(
  festivalId: string,
  query: PublicResultsQuery = {},
): Promise<PublicResultsPage> {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(query.pageSize ?? PUBLIC_RESULTS_PAGE_SIZE)),
  );

  const search = query.search?.trim();
  const typeFilter = query.type && query.type !== "ALL" ? query.type : null;

  const filters = [
    eq(resultTable.festivalId, festivalId),
    eq(programmeTable.status, "ANNOUNCED"),
  ];
  if (typeFilter) {
    filters.push(eq(programmeTable.type, typeFilter));
  }
  if (query.programmeId) {
    filters.push(eq(resultTable.programmeId, query.programmeId));
  }
  if (search) {
    // Search covers both the programme and its category, matching what the
    // client-side filter used to do before results were paginated.
    const pattern = `%${search}%`;
    const match = or(
      ilike(programmeTable.name, pattern),
      ilike(categoryTable.name, pattern),
    );
    if (match) filters.push(match);
  }

  const where = and(...filters);

  // 1. Which programmes are on this page?
  const [pageRows, totalRows] = await Promise.all([
    db
      .select({
        id: programmeTable.id,
        name: programmeTable.name,
        type: programmeTable.type,
        category: categoryTable.name,
        resultNumber: programmeTable.resultNumber,
      })
      .from(resultTable)
      .innerJoin(programmeTable, eq(programmeTable.id, resultTable.programmeId))
      .innerJoin(categoryTable, eq(categoryTable.id, programmeTable.categoryId))
      .where(where)
      .groupBy(
        programmeTable.id,
        programmeTable.name,
        programmeTable.type,
        categoryTable.name,
      )
      .orderBy(asc(programmeTable.name), asc(programmeTable.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),

    db
      .select({ value: count() })
      .from(
        db
          .select({ id: programmeTable.id })
          .from(resultTable)
          .innerJoin(
            programmeTable,
            eq(programmeTable.id, resultTable.programmeId),
          )
          .innerJoin(
            categoryTable,
            eq(categoryTable.id, programmeTable.categoryId),
          )
          .where(where)
          .groupBy(programmeTable.id)
          .as("matched_programmes"),
      ),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);

  if (pageRows.length === 0) {
    return { ...EMPTY_PAGE(page, pageSize), total };
  }

  // 2. Load only this page's result rows.
  const programmeIds = pageRows.map((row) => row.id);
  const rows = await db.query.result.findMany({
    where: and(
      eq(resultTable.festivalId, festivalId),
      eq(resultTable.isPublished, true),
      inArray(resultTable.programmeId, programmeIds),
    ),
    with: {
      programmeAssignment: {
        with: {
          participant: { with: { group: true } },
          group: true,
        },
      },
    },
  });

  const rowsByProgramme = new Map<string, typeof rows>();
  for (const row of rows) {
    const existing = rowsByProgramme.get(row.programmeId);
    if (existing) existing.push(row);
    else rowsByProgramme.set(row.programmeId, [row]);
  }

  const displayByAssignment = await loadTeamDisplayByAssignment(
    rows.map((r) => r.assignmentId),
  );

  const programmes = pageRows.map((programme) =>
    toProgrammeResults(
      programme,
      rowsByProgramme.get(programme.id) ?? [],
      displayByAssignment,
    ),
  );

  return {
    programmes,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

/**
 * The most recent first places, for the landing-page teaser.
 *
 * Kept separate from the paginated loader so the landing page never has to
 * read a full page of results just to show three winners.
 */
export async function getPublicTopResults(
  festivalId: string,
  options?: {
    limit?: number;
  },
): Promise<PublicResult[]> {
  const limit = options?.limit ?? 3;

  const winners = await db.query.result.findMany({
    where: and(
      eq(resultTable.festivalId, festivalId),
      eq(resultTable.position, 1),
      inArray(
        resultTable.programmeId,
        db
          .select({ id: programmeTable.id })
          .from(programmeTable)
          .where(eq(programmeTable.status, "ANNOUNCED")),
      ),
    ),
    orderBy: [sql`${resultTable.updatedAt} DESC NULLS LAST`],
    limit: limit * 4, // headroom: GROUP programmes yield one row per member
    with: {
      programme: { with: { category: true } },
      programmeAssignment: {
        with: {
          participant: { with: { group: true } },
          group: true,
        },
      },
    },
  });

  const byProgramme = new Map<string, typeof winners>();
  for (const row of winners) {
    const existing = byProgramme.get(row.programmeId);
    if (existing) existing.push(row);
    else byProgramme.set(row.programmeId, [row]);
  }

  const out: PublicResult[] = [];
  const winnerAssignmentIds = winners.map((w) => w.assignmentId);
  const displayByAssignment =
    await loadTeamDisplayByAssignment(winnerAssignmentIds);
  for (const rows of byProgramme.values()) {
    const programme = rows[0].programme;
    const mapped = toProgrammeResults(
      {
        id: programme.id,
        name: programme.name,
        type: programme.type as "INDIVIDUAL" | "GROUP",
        category: programme.category.name,
        resultNumber: programme.resultNumber,
      },
      rows,
      displayByAssignment,
    );
    const first = mapped.results[0];
    if (first) out.push(first);
    if (out.length >= limit) break;
  }

  return out;
}

/* ── Shaping ──────────────────────────────────────────────────────────── */

type ProgrammeRow = {
  id: string;
  name: string;
  type: "INDIVIDUAL" | "GROUP";
  category: string;
  resultNumber?: number | null;
};

/**
 * Under the XOR invariant, each GROUP result row maps to exactly one team
 * (the team-level programme_assignment). The team-leader's name is used as
 * the public "winner" label; otherwise the first member by assignedAt is
 * displayed.
 */
function toProgrammeResults(
  programme: ProgrammeRow,
  rows: { [key: string]: any }[],
  displayByAssignment: Map<
    string,
    { name: string | null; chestNumber: string | null }
  >,
): PublicProgrammeResults {
  const results: PublicResult[] = [];

  for (const row of rows) {
    const assignment = row.programmeAssignment;
    const isGroup = programme.type === "GROUP";

    let winner: string;
    let chestNo: string | null;
    if (isGroup) {
      const display = assignment
        ? displayByAssignment.get(assignment.id)
        : undefined;
      winner = display?.name ? `${display.name} and team` : "Team";
      chestNo = display?.chestNumber ?? null;
    } else {
      winner = assignment?.participant?.name || "Unknown";
      chestNo = assignment?.participant?.chestNumber ?? null;
    }

    results.push({
      id: row.id,
      programmeId: programme.id,
      programName: programme.name,
      programmeType: programme.type,
      category: programme.category,
      winner,
      team: isGroup
        ? (assignment?.group?.name ?? "")
        : (assignment?.participant?.group?.name ?? ""),
      position: row.position || 999,
      points: row.points ?? 0,
      awardPoints: row.awardPoints ?? 0,
      grade: row.grade,
      codeLetter: null,
      chestNo: chestNo,
      resultNumber: programme.resultNumber,
    });
  }

  results.sort((a, b) => a.position - b.position);
  const cappedResults = results.slice(0, 3);
  return {
    id: programme.id,
    name: programme.name,
    category: programme.category,
    type: programme.type,
    resultNumber: programme.resultNumber,
    results: cappedResults,
  };
}

async function loadTeamDisplayByAssignment(
  assignmentIds: string[],
): Promise<Map<string, { name: string | null; chestNumber: string | null }>> {
  const map = new Map<
    string,
    { name: string | null; chestNumber: string | null }
  >();
  if (assignmentIds.length === 0) return map;

  const leadRows = await db
    .select({
      programmeId: programmeTeamLeadTable.programmeId,
      groupId: programmeTeamLeadTable.groupId,
      teamNumber: programmeTeamLeadTable.teamNumber,
      participantId: programmeTeamLeadTable.participantId,
    })
    .from(programmeTeamLeadTable);
  const leadByTeamKey = new Map<string, string>();
  for (const l of leadRows) {
    leadByTeamKey.set(
      `${l.programmeId}:${l.groupId}:${l.teamNumber}`,
      l.participantId,
    );
  }

  const memberRows = await db
    .select({
      assignmentId: assignmentMemberTable.assignmentId,
      participantId: assignmentMemberTable.participantId,
      assignedAt: assignmentMemberTable.assignedAt,
    })
    .from(assignmentMemberTable)
    .innerJoin(
      assignmentTable,
      eq(assignmentTable.id, assignmentMemberTable.assignmentId),
    )
    .where(inArray(assignmentMemberTable.assignmentId, assignmentIds))
    .orderBy(asc(assignmentMemberTable.assignedAt));

  const memberPidByAssignment = new Map<string, string>();
  for (const m of memberRows) {
    if (!memberPidByAssignment.has(m.assignmentId)) {
      memberPidByAssignment.set(m.assignmentId, m.participantId);
    }
  }

  const leadPids = Array.from(new Set(leadRows.map((l) => l.participantId)));
  const memberPids = Array.from(
    new Set(memberRows.map((m) => m.participantId)),
  );
  const pids = Array.from(new Set([...leadPids, ...memberPids]));

  const participants = await db
    .select({
      id: participantTable.id,
      name: participantTable.name,
      chestNumber: participantTable.chestNumber,
    })
    .from(participantTable)
    .where(inArray(participantTable.id, pids));
  const participantById = new Map(participants.map((p) => [p.id, p]));

  for (const aid of assignmentIds) {
    const a = (
      await db
        .select({
          id: assignmentTable.id,
          programmeId: assignmentTable.programmeId,
          groupId: assignmentTable.groupId,
          teamNumber: assignmentTable.teamNumber,
        })
        .from(assignmentTable)
        .where(eq(assignmentTable.id, aid))
    )[0];
    if (!a?.groupId) continue;
    const leadPid = leadByTeamKey.get(
      `${a.programmeId}:${a.groupId}:${a.teamNumber ?? 1}`,
    );
    const fallbackPid = memberPidByAssignment.get(aid);
    const pid = leadPid ?? fallbackPid;
    if (!pid) continue;
    const p = participantById.get(pid);
    if (!p) continue;
    map.set(aid, { name: p.name, chestNumber: p.chestNumber });
  }
  return map;
}
