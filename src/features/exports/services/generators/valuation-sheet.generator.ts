import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  programmeCodeLetter,
  programme as programmeTable,
} from "@/core/database/schema";
import { ProgrammeMembershipService } from "@/features/assignments/services/programme-membership.service";
import type { ValuationSheetConfig } from "@/features/exports/schemas/export-config.schema";
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

interface ValuationRow {
  programmeId: string;
  programmeName: string;
  categoryName: string;
  chestNumber: string;
  name: string;
}

export async function generateValuationSheet(
  festivalId: string,
  config: ValuationSheetConfig,
  format: ExportFormat,
  festivalName: string,
): Promise<GeneratedExport> {
  const progConditions = [eq(programmeTable.festivalId, festivalId)];
  if (config.programmeIds.length)
    progConditions.push(inArray(programmeTable.id, config.programmeIds));
  if (config.categoryIds.length)
    progConditions.push(inArray(programmeTable.categoryId, config.categoryIds));

  const programmes = await db
    .select({
      id: programmeTable.id,
      name: programmeTable.name,
      categoryName: categoryTable.name,
    })
    .from(programmeTable)
    .innerJoin(categoryTable, eq(programmeTable.categoryId, categoryTable.id))
    .where(and(...progConditions));

  const programmeIds = programmes.map((p) => p.id);
  const progMeta = new Map(programmes.map((p) => [p.id, p]));

  const enrolledRows: {
    programmeId: string;
    chestNumber: string | null;
    name: string;
  }[] = [];
  for (const programmeId of programmeIds) {
    const enrolled =
      await ProgrammeMembershipService.getParticipantsForProgramme(programmeId);
    for (const row of enrolled) {
      if (
        config.gender !== "ALL" &&
        row.participant.gender !== config.gender
      )
        continue;
      enrolledRows.push({
        programmeId,
        chestNumber: row.participant.chestNumber,
        name: row.participant.name,
      });
    }
  }

  const rows: ValuationRow[] = enrolledRows.map((r) => {
    const meta = progMeta.get(r.programmeId);
    return {
      programmeId: r.programmeId,
      programmeName: meta?.name ?? "",
      categoryName: meta?.categoryName ?? "",
      chestNumber: r.chestNumber ?? "",
      name: r.name,
    };
  });

  // Programme-level code letters for the section heading.
  let codeByProgramme = new Map<string, string>();
  if (config.includeCodeLetters && programmeIds.length) {
    const codes = await db
      .select({
        programmeId: programmeCodeLetter.programmeId,
        code: programmeCodeLetter.code,
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

  const columns = ["Chest", "Participant", "Marks", "Grade", "Rank"];

  if (format === "CSV") {
    const header = ["Competition", "Category", ...columns];
    const body = rows.map((r) => [
      r.programmeName,
      r.categoryName,
      r.chestNumber,
      r.name,
      "",
      "",
      "",
    ]);
    return {
      bytes: buildCsv([header, ...body]),
      fileName: "valuation-sheet.csv",
      mimeType: CSV_MIME,
      itemCount: rows.length,
    };
  }

  // One section per competition, blank score columns for judges to fill.
  const byProgramme = new Map<string, ValuationRow[]>();
  for (const r of rows) {
    const arr = byProgramme.get(r.programmeId) ?? [];
    arr.push(r);
    byProgramme.set(r.programmeId, arr);
  }

  const sections: PdfSection[] = [...byProgramme.entries()].map(
    ([programmeId, progRows]) => {
      const first = progRows[0];
      const code = codeByProgramme.get(programmeId);
      return {
        heading: first.programmeName,
        subheading: [first.categoryName, code ? `Code: ${code}` : null]
          .filter(Boolean)
          .join(" · "),
        columns,
        columnWeights: [1.2, 3, 2, 1.5, 1.2],
        rows: progRows.map((r) => [r.chestNumber, r.name, "", "", ""]),
      };
    },
  );

  return {
    bytes: buildSectionedPdf({
      festivalName,
      title: "Valuation Sheet",
      sections,
      pageLayout: config.pageLayout,
      emptyMessage: "No competitions matched the selected filters.",
    }),
    fileName: "valuation-sheet.pdf",
    mimeType: PDF_MIME,
    itemCount: rows.length,
  };
}
