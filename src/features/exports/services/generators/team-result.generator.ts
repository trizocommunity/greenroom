import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  group as groupTable,
  programmeAssignment,
  result as resultTable,
} from "@/core/database/schema";
import type { TeamResultConfig } from "@/features/exports/schemas/export-config.schema";
import {
  buildCsv,
  CSV_MIME,
} from "@/features/exports/services/render/csv-sheet";
import type {
  ExportFormat,
  GeneratedExport,
} from "@/features/exports/types/export.types";

interface TeamTotals {
  teamId: string;
  teamName: string;
  points: number;
  awardPoints: number;
  resultCount: number;
}

async function loadTeamTotals(
  festivalId: string,
  config: TeamResultConfig,
): Promise<TeamTotals[]> {
  const conditions = [eq(resultTable.festivalId, festivalId)];
  if (config.onlyPublished) {
    conditions.push(eq(resultTable.isPublished, true));
  }
  if (config.teamIds.length > 0) {
    conditions.push(inArray(programmeAssignment.groupId, config.teamIds));
  }
  if (config.programmeIds.length > 0) {
    conditions.push(
      inArray(programmeAssignment.programmeId, config.programmeIds),
    );
  }
  if (config.categoryIds.length > 0) {
    conditions.push(
      inArray(programmeAssignment.categoryId, config.categoryIds),
    );
  }

  const rows = await db
    .select({
      teamId: groupTable.id,
      teamName: groupTable.name,
      points: resultTable.points,
      awardPoints: resultTable.awardPoints,
    })
    .from(resultTable)
    .innerJoin(
      programmeAssignment,
      eq(resultTable.assignmentId, programmeAssignment.id),
    )
    .innerJoin(groupTable, eq(programmeAssignment.groupId, groupTable.id))
    .where(and(...conditions));

  const byTeam = new Map<string, TeamTotals>();
  for (const row of rows) {
    const existing = byTeam.get(row.teamId) ?? {
      teamId: row.teamId,
      teamName: row.teamName,
      points: 0,
      awardPoints: 0,
      resultCount: 0,
    };
    existing.points += row.points ?? 0;
    existing.awardPoints += row.awardPoints ?? 0;
    existing.resultCount += 1;
    byTeam.set(row.teamId, existing);
  }

  return [...byTeam.values()].sort(
    (a, b) =>
      b.points + b.awardPoints - (a.points + a.awardPoints) ||
      a.teamName.localeCompare(b.teamName),
  );
}

export async function generateTeamResult(
  festivalId: string,
  config: TeamResultConfig,
  format: ExportFormat,
): Promise<GeneratedExport> {
  const totals = await loadTeamTotals(festivalId, config);

  if (format === "CSV") {
    const header = [
      "Rank",
      "Team",
      "Points",
      ...(config.includeAwardPoints ? ["Award Points"] : []),
      "Total",
      "Results",
    ];
    const rows: (string | number)[][] = [header];
    totals.forEach((t, i) => {
      rows.push([
        i + 1,
        t.teamName,
        t.points,
        ...(config.includeAwardPoints ? [t.awardPoints] : []),
        t.points + t.awardPoints,
        t.resultCount,
      ]);
    });
    return {
      bytes: buildCsv(rows),
      fileName: "team-result.csv",
      mimeType: CSV_MIME,
      itemCount: totals.length,
    };
  }

  // PDF path is added in a later phase (shared jspdf renderer). Until then,
  // the orchestrator only routes CSV here.
  throw new Error("PDF format for Team Result is not implemented yet.");
}
