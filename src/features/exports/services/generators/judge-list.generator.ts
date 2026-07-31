import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  judgementConfig,
  judgementConfigJudge,
  judgeStageAssignment,
  judge as judgeTable,
  programme as programmeTable,
  stage as stageTable,
} from "@/core/database/schema";
import type { JudgeListConfig } from "@/features/exports/schemas/export-config.schema";
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

interface JudgeStageRow {
  judgeId: string;
  judgeName: string;
  description: string;
  stageId: string;
  stageName: string;
}

interface CompetitionJudgeRow {
  programmeId: string;
  programmeName: string;
  judgeName: string;
}

/** Judge-wise view: each judge with the stages they are assigned to. */
async function loadJudgeWise(
  festivalId: string,
  config: JudgeListConfig,
): Promise<JudgeStageRow[]> {
  const conditions = [eq(judgeStageAssignment.festivalId, festivalId)];
  if (config.stageIds.length)
    conditions.push(inArray(judgeStageAssignment.stageId, config.stageIds));

  return db
    .select({
      judgeId: judgeTable.id,
      judgeName: judgeTable.name,
      description: judgeTable.description,
      stageId: stageTable.id,
      stageName: stageTable.name,
    })
    .from(judgeStageAssignment)
    .innerJoin(judgeTable, eq(judgeStageAssignment.judgeId, judgeTable.id))
    .innerJoin(stageTable, eq(judgeStageAssignment.stageId, stageTable.id))
    .where(and(...conditions))
    .then((rows) =>
      rows.map((r) => ({
        judgeId: r.judgeId,
        judgeName: r.judgeName,
        description: r.description ?? "",
        stageId: r.stageId,
        stageName: r.stageName,
      })),
    );
}

/** Competition-wise view: each competition with its assigned judges. */
async function loadCompetitionWise(
  festivalId: string,
  config: JudgeListConfig,
): Promise<CompetitionJudgeRow[]> {
  const conditions = [eq(judgementConfig.festivalId, festivalId)];
  if (config.programmeIds.length)
    conditions.push(inArray(judgementConfig.programmeId, config.programmeIds));
  if (config.categoryIds.length)
    conditions.push(inArray(programmeTable.categoryId, config.categoryIds));

  return db
    .select({
      programmeId: programmeTable.id,
      programmeName: programmeTable.name,
      judgeName: judgeTable.name,
    })
    .from(judgementConfigJudge)
    .innerJoin(
      judgementConfig,
      eq(judgementConfigJudge.configId, judgementConfig.id),
    )
    .innerJoin(
      programmeTable,
      eq(judgementConfig.programmeId, programmeTable.id),
    )
    .innerJoin(judgeTable, eq(judgementConfigJudge.judgeId, judgeTable.id))
    .where(and(...conditions))
    .then((rows) =>
      rows.map((r) => ({
        programmeId: r.programmeId,
        programmeName: r.programmeName,
        judgeName: r.judgeName,
      })),
    );
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

export async function generateJudgeList(
  festivalId: string,
  config: JudgeListConfig,
  format: ExportFormat,
  festivalName: string,
): Promise<GeneratedExport> {
  const judgeWise = config.grouping === "JUDGE_WISE";

  if (judgeWise) {
    const rows = await loadJudgeWise(festivalId, config);
    const byJudge = groupBy(rows, (r) => r.judgeId);

    if (format === "CSV") {
      const header = [
        "Judge",
        ...(config.includeDescription ? ["Details"] : []),
        "Stage",
      ];
      const body = rows.map((r) => [
        r.judgeName,
        ...(config.includeDescription ? [r.description] : []),
        r.stageName,
      ]);
      return {
        bytes: buildCsv([header, ...body]),
        fileName: "judge-list.csv",
        mimeType: CSV_MIME,
        itemCount: byJudge.size,
      };
    }

    const sections: PdfSection[] = [...byJudge.values()].map((judgeRows) => {
      const first = judgeRows[0];
      return {
        heading: first.judgeName,
        subheading: config.includeDescription ? first.description : undefined,
        columns: ["Assigned Stages"],
        rows: judgeRows.map((r) => [r.stageName]),
      };
    });
    return {
      bytes: buildSectionedPdf({
        festivalName,
        title: "Judge List (Judge-wise)",
        sections,
        pageLayout: config.layout,
      }),
      fileName: "judge-list.pdf",
      mimeType: PDF_MIME,
      itemCount: byJudge.size,
    };
  }

  // Competition-wise
  const rows = await loadCompetitionWise(festivalId, config);
  const byProgramme = groupBy(rows, (r) => r.programmeId);

  if (format === "CSV") {
    const header = ["Competition", "Judge"];
    const body = rows.map((r) => [r.programmeName, r.judgeName]);
    return {
      bytes: buildCsv([header, ...body]),
      fileName: "judge-list.csv",
      mimeType: CSV_MIME,
      itemCount: byProgramme.size,
    };
  }

  const sections: PdfSection[] = [...byProgramme.values()].map((progRows) => ({
    heading: progRows[0].programmeName,
    columns: ["Judges"],
    rows: progRows.map((r) => [r.judgeName]),
  }));
  return {
    bytes: buildSectionedPdf({
      festivalName,
      title: "Judge List (Competition-wise)",
      sections,
      pageLayout: config.layout,
    }),
    fileName: "judge-list.pdf",
    mimeType: PDF_MIME,
    itemCount: byProgramme.size,
  };
}
