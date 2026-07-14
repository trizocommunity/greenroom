import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  festival as festivalTable,
  group as groupTable,
  programmeAssignment,
  programmeCodeLetter,
  programme as programmeTable,
  result as resultTable,
  student as studentTable,
} from "@/core/database/schema";
import {
  buildCandidateCardBindings,
  buildResultPosterBindings,
  buildTeamPointsBindings,
} from "@/features/posters/services/poster-bindings.service";
import {
  buildCandidatePlaceholderBindings,
  buildRealPreviewPayload,
  buildResultPlaceholderBindings,
  buildTeamPointsPlaceholderBindings,
  type EditorPreviewBindingsPayload,
} from "@/features/posters/services/poster-editor-preview-placeholders";
import type { PosterTemplateType } from "@/features/posters/types/poster-template.types";

export type { EditorPreviewBindingsPayload };

function formatSingleFestDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Event dates for festDate binding: range when both set, else start or end, else today. */
export function formatFestDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const fallback = () =>
    new Date().toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (!start && !end) return fallback();
  if (start && !end) {
    try {
      return formatSingleFestDate(start);
    } catch {
      return start;
    }
  }
  if (!start && end) {
    try {
      return formatSingleFestDate(end);
    } catch {
      return end;
    }
  }

  try {
    const s = new Date(start!);
    const e = new Date(end!);
    if (Number.isNaN(s.getTime())) return formatSingleFestDate(end!);
    if (Number.isNaN(e.getTime())) return formatSingleFestDate(start!);
    if (s.toDateString() === e.toDateString())
      return formatSingleFestDate(start!);

    const sDay = s.getDate();
    const eDay = e.getDate();
    const sMonth = s.toLocaleDateString(undefined, { month: "short" });
    const eMonth = e.toLocaleDateString(undefined, { month: "short" });
    const sYear = s.getFullYear();
    const eYear = e.getFullYear();

    if (sYear === eYear && sMonth === eMonth) {
      return `${sDay}–${eDay} ${sMonth} ${sYear}`;
    }
    if (sYear === eYear) {
      return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${sYear}`;
    }
    return `${formatSingleFestDate(start!)} – ${formatSingleFestDate(end!)}`;
  } catch {
    return fallback();
  }
}

async function categoryNameFromFirstProgramme(
  studentId: string,
): Promise<string | null> {
  const row = await db
    .select({ name: categoryTable.name })
    .from(programmeAssignment)
    .innerJoin(
      programmeTable,
      eq(programmeAssignment.programmeId, programmeTable.id),
    )
    .innerJoin(categoryTable, eq(programmeTable.categoryId, categoryTable.id))
    .where(eq(programmeAssignment.studentId, studentId))
    .orderBy(asc(programmeTable.name))
    .limit(1);

  return row[0]?.name ?? null;
}

type TeamStandingRow = { rank: number; name: string; points: number };

function parseTeamStandings(raw: unknown): TeamStandingRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, i) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const name =
        typeof r.name === "string"
          ? r.name
          : typeof r.teamName === "string"
            ? r.teamName
            : null;
      if (!name) return null;
      return {
        rank: typeof r.rank === "number" ? r.rank : i + 1,
        name,
        points: typeof r.points === "number" ? r.points : 0,
      };
    })
    .filter((x): x is TeamStandingRow => x !== null);
}

async function firstProgrammeSample(festivalId: string) {
  const row = await db.query.programme.findFirst({
    where: eq(programmeTable.festivalId, festivalId),
    columns: { name: true },
    with: { category: { columns: { name: true } } },
    orderBy: [asc(programmeTable.createdAt)],
  });
  return {
    programmeName: row?.name,
    categoryName: row?.category?.name,
  };
}

async function loadResultPreview(
  festivalId: string,
  festivalName: string,
  festDate: string,
  festLocation: string,
): Promise<EditorPreviewBindingsPayload> {
  const programmeRow = await db
    .select({ programmeId: programmeTable.id })
    .from(resultTable)
    .innerJoin(
      programmeAssignment,
      eq(resultTable.assignmentId, programmeAssignment.id),
    )
    .where(
      and(
        eq(resultTable.festivalId, festivalId),
        eq(resultTable.isPublished, true),
      ),
    )
    .orderBy(desc(resultTable.updatedAt))
    .limit(1);

  const programmeId = programmeRow[0]?.programmeId;
  if (!programmeId) {
    const sample = await firstProgrammeSample(festivalId);
    return buildResultPlaceholderBindings(
      festivalName,
      festDate,
      festLocation,
      sample,
    );
  }

  const programme = await db.query.programme.findFirst({
    where: eq(programmeTable.id, programmeId),
    columns: { id: true, name: true, type: true },
  });
  if (!programme) {
    const sample = await firstProgrammeSample(festivalId);
    return buildResultPlaceholderBindings(
      festivalName,
      festDate,
      festLocation,
      sample,
    );
  }

  const category = await db
    .select({ name: categoryTable.name })
    .from(programmeTable)
    .innerJoin(categoryTable, eq(programmeTable.categoryId, categoryTable.id))
    .where(eq(programmeTable.id, programmeId))
    .limit(1);

  const codeLetter = await db.query.programmeCodeLetter.findFirst({
    where: eq(programmeCodeLetter.programmeId, programmeId),
    columns: { code: true },
    orderBy: [desc(programmeCodeLetter.issuedAt)],
  });

  const rows = await db
    .select({
      position: resultTable.position,
      grade: resultTable.grade,
      points: resultTable.points,
      studentName: studentTable.name,
      groupName: groupTable.name,
      programmeType: programmeTable.type,
    })
    .from(resultTable)
    .innerJoin(
      programmeAssignment,
      eq(resultTable.assignmentId, programmeAssignment.id),
    )
    .innerJoin(
      programmeTable,
      eq(programmeAssignment.programmeId, programmeTable.id),
    )
    .leftJoin(studentTable, eq(programmeAssignment.studentId, studentTable.id))
    .leftJoin(groupTable, eq(programmeAssignment.groupId, groupTable.id))
    .where(
      and(
        eq(programmeAssignment.programmeId, programmeId),
        eq(resultTable.isPublished, true),
      ),
    )
    .orderBy(asc(resultTable.position));

  const programmeType =
    programme.type ?? rows[0]?.programmeType ?? "INDIVIDUAL";
  const winners = rows.map((r) => ({
    position: r.position ?? 0,
    name:
      programmeType === "GROUP"
        ? (r.groupName ?? "Team")
        : (r.studentName ?? r.groupName ?? "—"),
    team: r.groupName ?? "—",
    grade: r.grade,
    points: r.points ?? 0,
  }));

  const bindings = buildResultPosterBindings({
    festivalName,
    programmeName: programme.name,
    categoryName: category[0]?.name ?? "",
    winners,
    programmeResultCode: codeLetter?.code ?? null,
  });

  return buildRealPreviewPayload({
    ...bindings,
    festDate,
    festLocation,
  });
}

async function loadCandidatePreview(
  festivalId: string,
  festivalName: string,
  festDate: string,
  festLocation: string,
): Promise<EditorPreviewBindingsPayload> {
  const student = await db.query.student.findFirst({
    where: and(
      eq(studentTable.festivalId, festivalId),
      isNotNull(studentTable.chestNumber),
    ),
    columns: { id: true, name: true, chestNumber: true },
    with: { group: { columns: { name: true } } },
    orderBy: [asc(studentTable.chestNumber)],
  });

  if (!student?.chestNumber) {
    return buildCandidatePlaceholderBindings(
      festivalName,
      festDate,
      festLocation,
    );
  }

  const categoryName = await categoryNameFromFirstProgramme(student.id);

  const bindings = buildCandidateCardBindings({
    festivalName,
    studentName: student.name,
    chestNumber: student.chestNumber,
    teamName: student.group?.name ?? "—",
    qrPayload: student.chestNumber,
    categoryName: categoryName ?? "—",
  });

  return buildRealPreviewPayload({
    ...bindings,
    festDate,
    festLocation,
  });
}

async function loadTeamPointsPreview(
  festivalId: string,
  festivalName: string,
  festDate: string,
  festLocation: string,
): Promise<EditorPreviewBindingsPayload> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { teamStandings: true },
  });

  const teams = parseTeamStandings(festival?.teamStandings);

  if (teams.length > 0) {
    const bindings = buildTeamPointsBindings({
      festivalName,
      generatedAt: festDate,
      teams,
    });
    return buildRealPreviewPayload({ ...bindings, festLocation });
  }

  const groups = await db.query.group.findMany({
    where: eq(groupTable.festivalId, festivalId),
    columns: { name: true },
    limit: 12,
    orderBy: [asc(groupTable.name)],
  });

  if (groups.length === 0) {
    return buildTeamPointsPlaceholderBindings(
      festivalName,
      festDate,
      festLocation,
      [],
    );
  }

  return buildTeamPointsPlaceholderBindings(
    festivalName,
    festDate,
    festLocation,
    groups.map((g) => g.name),
  );
}

/** Festival editor preview: real data when available, honest placeholders otherwise. */
export async function getFestivalEditorPreviewBindings(
  festivalId: string,
  templateType: PosterTemplateType,
): Promise<EditorPreviewBindingsPayload> {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: {
      name: true,
      location: true,
      orgLocation: true,
      startDate: true,
      endDate: true,
    },
  });

  const festivalName = festival?.name ?? "Festival";
  const festDate = formatFestDateRange(festival?.startDate, festival?.endDate);
  const festLocation = festival?.location ?? festival?.orgLocation ?? "Venue";

  switch (templateType) {
    case "RESULT":
      return loadResultPreview(
        festivalId,
        festivalName,
        festDate,
        festLocation,
      );
    case "CANDIDATE_CARD":
      return loadCandidatePreview(
        festivalId,
        festivalName,
        festDate,
        festLocation,
      );
    case "TEAM_POINTS":
      return loadTeamPointsPreview(
        festivalId,
        festivalName,
        festDate,
        festLocation,
      );
    default:
      return buildResultPlaceholderBindings(
        festivalName,
        festDate,
        festLocation,
      );
  }
}
