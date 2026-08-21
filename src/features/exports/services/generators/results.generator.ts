import "server-only";

import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  group as groupTable,
  participant as participantTable,
  programmeAssignment,
  programmeCodeLetter,
  programme as programmeTable,
  result as resultTable,
} from "@/core/database/schema";
import { formatDate, parseInstant } from "@/core/datetime";
import type { ResultsConfig } from "@/features/exports/schemas/export-config.schema";
import {
  buildCsv,
  CSV_MIME,
} from "@/features/exports/services/render/csv-sheet";
import {
  buildSectionedPdf,
  PDF_MIME,
  type PdfSection,
} from "@/features/exports/services/render/pdf-doc";
import type {
  ExportFormat,
  GeneratedExport,
} from "@/features/exports/types/export.types";

interface ResultRow {
  programmeId: string;
  programmeName: string;
  categoryName: string;
  teamName: string;
  name: string;
  position: number | null;
  grade: string | null;
  points: number;
  phone: string;
  dob: string;
  remarks: string;
}

function formatDob(iso: string | null): string {
  if (!iso) return "";
  return parseInstant(iso) ? formatDate(iso, { style: "medium" }) : "";
}

async function loadResultRows(
  festivalId: string,
  config: ResultsConfig,
): Promise<{ rows: ResultRow[]; codeByProgramme: Map<string, string> }> {
  const conditions = [eq(resultTable.festivalId, festivalId)];
  if (config.onlyPublished) conditions.push(eq(resultTable.isPublished, true));
  if (config.gender !== "ALL")
    conditions.push(eq(participantTable.gender, config.gender));
  if (config.programmeIds.length)
    conditions.push(inArray(programmeTable.id, config.programmeIds));
  if (config.categoryIds.length)
    conditions.push(inArray(programmeTable.categoryId, config.categoryIds));
  conditions.push(gte(resultTable.position, config.startResultNumber));
  if (config.endResultNumber !== null)
    conditions.push(lte(resultTable.position, config.endResultNumber));

  const rows = await db
    .select({
      programmeId: programmeTable.id,
      programmeName: programmeTable.name,
      programmeType: programmeTable.type,
      categoryName: categoryTable.name,
      teamName: groupTable.name,
      participantName: participantTable.name,
      position: resultTable.position,
      grade: resultTable.grade,
      points: resultTable.points,
      phone: participantTable.phone,
      dob: participantTable.dateOfBirth,
      remarks: resultTable.remarks,
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
    .innerJoin(categoryTable, eq(programmeTable.categoryId, categoryTable.id))
    .leftJoin(
      participantTable,
      eq(programmeAssignment.participantId, participantTable.id),
    )
    .leftJoin(groupTable, eq(programmeAssignment.groupId, groupTable.id))
    .where(and(...conditions))
    .orderBy(asc(programmeTable.name), asc(resultTable.position));

  const mapped: ResultRow[] = rows.map((r) => ({
    programmeId: r.programmeId,
    programmeName: r.programmeName,
    categoryName: r.categoryName ?? "",
    teamName: r.teamName ?? "",
    name:
      r.programmeType === "GROUP"
        ? (r.teamName ?? "Team")
        : (r.participantName ?? r.teamName ?? "—"),
    position: r.position,
    grade: r.grade,
    points: r.points ?? 0,
    phone: r.phone ?? "",
    dob: formatDob(r.dob),
    remarks: r.remarks ?? "",
  }));

  let codeByProgramme = new Map<string, string>();
  if (config.includeCodeLetter) {
    const programmeIds = [...new Set(mapped.map((m) => m.programmeId))];
    if (programmeIds.length) {
      const codes = await db
        .select({
          programmeId: programmeCodeLetter.programmeId,
          code: programmeCodeLetter.code,
          issuedAt: programmeCodeLetter.issuedAt,
        })
        .from(programmeCodeLetter)
        .where(inArray(programmeCodeLetter.programmeId, programmeIds))
        .orderBy(desc(programmeCodeLetter.issuedAt));
      codeByProgramme = new Map();
      for (const c of codes) {
        if (!codeByProgramme.has(c.programmeId))
          codeByProgramme.set(c.programmeId, c.code);
      }
    }
  }

  return { rows: mapped, codeByProgramme };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k) ?? [];
    arr.push(item);
    map.set(k, arr);
  }
  return map;
}

export async function generateResults(
  festivalId: string,
  config: ResultsConfig,
  format: ExportFormat,
  festivalName: string,
): Promise<GeneratedExport> {
  const { rows, codeByProgramme } = await loadResultRows(festivalId, config);
  const teamWise = config.listType === "TEAM_WISE";

  const cols = (): string[] => [
    "#",
    "Name",
    "Team",
    ...(config.includeGrades ? ["Grade"] : []),
    ...(config.includePoints ? ["Points"] : []),
    ...(config.includeCodeLetter ? ["Code"] : []),
    ...(config.includePhone ? ["Phone"] : []),
    ...(config.includeDob ? ["DOB"] : []),
    ...(config.includeJudgeReports ? ["Remarks"] : []),
  ];

  const cellsFor = (r: ResultRow): (string | number)[] => [
    r.position ?? "",
    r.name,
    r.teamName,
    ...(config.includeGrades ? [r.grade ?? ""] : []),
    ...(config.includePoints ? [r.points] : []),
    ...(config.includeCodeLetter
      ? [codeByProgramme.get(r.programmeId) ?? ""]
      : []),
    ...(config.includePhone ? [r.phone] : []),
    ...(config.includeDob ? [r.dob] : []),
    ...(config.includeJudgeReports ? [r.remarks] : []),
  ];

  if (format === "CSV") {
    const header = [teamWise ? "Team" : "Competition", "Category", ...cols()];
    const body = rows.map((r) => [
      teamWise ? r.teamName : r.programmeName,
      r.categoryName,
      ...cellsFor(r),
    ]);
    return {
      bytes: buildCsv([header, ...body]),
      fileName: "results.csv",
      mimeType: CSV_MIME,
      itemCount: rows.length,
    };
  }

  const grouped = groupBy(rows, (r) => (teamWise ? r.teamName : r.programmeId));
  const sections: PdfSection[] = [...grouped.entries()].map(([, groupRows]) => {
    const first = groupRows[0];
    const heading = teamWise ? first.teamName || "—" : first.programmeName;
    const codePart =
      config.includeCodeLetter && !teamWise
        ? codeByProgramme.get(first.programmeId)
        : undefined;
    const subheading = teamWise
      ? `${groupRows.length} results`
      : [first.categoryName, codePart ? `Code: ${codePart}` : null]
          .filter(Boolean)
          .join(" · ");
    return {
      heading,
      subheading,
      columns: cols(),
      rows: groupRows.map(cellsFor),
    };
  });

  return {
    bytes: buildSectionedPdf({
      festivalName,
      title: teamWise ? "Team-wise Results" : "Results",
      sections,
      pageLayout: config.pageLayout,
    }),
    fileName: "results.pdf",
    mimeType: PDF_MIME,
    itemCount: rows.length,
  };
}
