import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  programme as programmeTable,
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
  grade?: string | null;
  codeLetter?: string | null;
}

/** One programme with its announced results already sorted by position. */
export interface PublicProgrammeResults {
  id: string;
  name: string;
  category: string;
  type: "INDIVIDUAL" | "GROUP";
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
  publicDisplayMode?: "programme_results" | "team_standings";
}

export const PUBLIC_RESULTS_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const getResultPoints = (result: {
  points?: number;
  awardPoints?: number | null;
}) => result.awardPoints ?? result.points ?? 0;

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

  if (query.publicDisplayMode === "team_standings") {
    return EMPTY_PAGE(page, pageSize);
  }

  const search = query.search?.trim();
  const typeFilter = query.type && query.type !== "ALL" ? query.type : null;

  const filters = [
    eq(resultTable.festivalId, festivalId),
    eq(resultTable.isAnnounced, true),
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
      eq(resultTable.isAnnounced, true),
      inArray(resultTable.programmeId, programmeIds),
    ),
    with: {
      programmeAssignment: {
        with: { participant: true, group: true },
      },
    },
  });

  const rowsByProgramme = new Map<string, typeof rows>();
  for (const row of rows) {
    const existing = rowsByProgramme.get(row.programmeId);
    if (existing) existing.push(row);
    else rowsByProgramme.set(row.programmeId, [row]);
  }

  const programmes = pageRows.map((programme) =>
    toProgrammeResults(programme, rowsByProgramme.get(programme.id) ?? []),
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
    publicDisplayMode?: "programme_results" | "team_standings";
  },
): Promise<PublicResult[]> {
  if (options?.publicDisplayMode === "team_standings") return [];

  const limit = options?.limit ?? 3;

  const winners = await db.query.result.findMany({
    where: and(
      eq(resultTable.festivalId, festivalId),
      eq(resultTable.isAnnounced, true),
      eq(resultTable.position, 1),
    ),
    orderBy: [sql`${resultTable.announcedAt} DESC NULLS LAST`],
    limit: limit * 4, // headroom: GROUP programmes yield one row per member
    with: {
      programme: { with: { category: true } },
      programmeAssignment: { with: { participant: true, group: true } },
    },
  });

  const byProgramme = new Map<string, typeof winners>();
  for (const row of winners) {
    const existing = byProgramme.get(row.programmeId);
    if (existing) existing.push(row);
    else byProgramme.set(row.programmeId, [row]);
  }

  const out: PublicResult[] = [];
  for (const rows of byProgramme.values()) {
    const programme = rows[0].programme;
    const mapped = toProgrammeResults(
      {
        id: programme.id,
        name: programme.name,
        type: programme.type as "INDIVIDUAL" | "GROUP",
        category: programme.category.name,
      },
      rows,
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
};

/**
 * GROUP programmes store one result row per assigned member, so they are
 * collapsed to one row per team before display; INDIVIDUAL programmes map
 * one-to-one.
 */
function toProgrammeResults(
  programme: ProgrammeRow,
  rows: { [key: string]: any }[],
): PublicProgrammeResults {
  const results: PublicResult[] = [];

  if (programme.type === "GROUP") {
    const teams = new Map<string, PublicResult>();

    for (const row of rows) {
      const assignment = row.programmeAssignment;
      const teamKey = `${assignment?.group?.id ?? "unknown"}-${
        assignment?.teamNumber ?? 1
      }`;
      if (teams.has(teamKey)) continue;

      const teamName =
        (assignment?.group?.name ?? "") +
        (assignment?.teamNumber > 1 ? ` Team ${assignment.teamNumber}` : "");

      teams.set(teamKey, {
        id: row.id,
        programmeId: programme.id,
        programName: programme.name,
        programmeType: "GROUP",
        category: programme.category,
        winner: teamName || "Unknown Team",
        team: assignment?.group?.name || "N/A",
        position: row.position || 999,
        points: getResultPoints(row),
        grade: row.grade,
        codeLetter: null,
      });
    }

    results.push(...teams.values());
  } else {
    for (const row of rows) {
      results.push({
        id: row.id,
        programmeId: programme.id,
        programName: programme.name,
        programmeType: "INDIVIDUAL",
        category: programme.category,
        winner: row.programmeAssignment?.participant?.name || "Unknown",
        team: row.programmeAssignment?.group?.name || "N/A",
        position: row.position || 999,
        points: getResultPoints(row),
        grade: row.grade,
        codeLetter: null,
      });
    }
  }

  results.sort((a, b) => a.position - b.position);

  return {
    id: programme.id,
    name: programme.name,
    category: programme.category,
    type: programme.type,
    results,
  };
}
