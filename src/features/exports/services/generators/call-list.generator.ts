import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  group as groupTable,
  participant as participantTable,
  programmeAssignment,
  programme as programmeTable,
  scheduleEntry,
} from "@/core/database/schema";
import { formatDate, parseInstant } from "@/core/datetime";
import type { CallListConfig } from "@/features/exports/schemas/export-config.schema";
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

interface CallRow {
  programmeId: string;
  programmeName: string;
  categoryName: string;
  chestNumber: string;
  name: string;
  teamName: string;
  dob: string;
  phone: string;
}

function formatDob(iso: string | null, festivalTz: string): string {
  if (!iso) return "";
  return parseInstant(iso)
    ? formatDate(iso, { tz: festivalTz, style: "medium" })
    : "";
}

async function loadCallRows(
  festivalId: string,
  config: CallListConfig,
  festivalTz: string,
): Promise<CallRow[]> {
  // Resolve which programmes are in scope (category / programme / schedule).
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

  // Schedule state filter.
  if (config.scheduleState !== "ALL" || config.stageIds.length) {
    const scheduled = await db
      .select({
        programmeId: scheduleEntry.programmeId,
        stageId: scheduleEntry.stageId,
      })
      .from(scheduleEntry)
      .where(
        and(
          eq(scheduleEntry.festivalId, festivalId),
          eq(scheduleEntry.type, "PROGRAMME"),
        ),
      );
    const scheduledStages = new Map<string, Set<string>>();
    for (const s of scheduled) {
      if (!s.programmeId) continue;
      const set = scheduledStages.get(s.programmeId) ?? new Set<string>();
      if (s.stageId) set.add(s.stageId);
      scheduledStages.set(s.programmeId, set);
    }
    const keep = new Set(
      programmes
        .filter((p) => {
          const isScheduled = scheduledStages.has(p.id);
          if (config.scheduleState === "SCHEDULED" && !isScheduled)
            return false;
          if (config.scheduleState === "UNSCHEDULED" && isScheduled)
            return false;
          if (config.stageIds.length) {
            const stages = scheduledStages.get(p.id);
            if (!stages || !config.stageIds.some((id) => stages.has(id)))
              return false;
          }
          return true;
        })
        .map((p) => p.id),
    );
    for (let i = programmes.length - 1; i >= 0; i--) {
      if (!keep.has(programmes[i].id)) programmes.splice(i, 1);
    }
  }

  const programmeIds = programmes.map((p) => p.id);
  if (programmeIds.length === 0) return [];
  const progMeta = new Map(programmes.map((p) => [p.id, p]));

  // Participants assigned to those programmes.
  const assignConditions = [
    inArray(programmeAssignment.programmeId, programmeIds),
  ];
  if (config.gender !== "ALL")
    assignConditions.push(eq(participantTable.gender, config.gender));

  const rows = await db
    .select({
      programmeId: programmeAssignment.programmeId,
      chestNumber: participantTable.chestNumber,
      name: participantTable.name,
      teamName: groupTable.name,
      dob: participantTable.dateOfBirth,
      phone: participantTable.phone,
    })
    .from(programmeAssignment)
    .innerJoin(
      participantTable,
      eq(programmeAssignment.participantId, participantTable.id),
    )
    .leftJoin(groupTable, eq(participantTable.groupId, groupTable.id))
    .where(and(...assignConditions));

  return rows.map((r) => {
    const meta = progMeta.get(r.programmeId);
    return {
      programmeId: r.programmeId,
      programmeName: meta?.name ?? "",
      categoryName: meta?.categoryName ?? "",
      chestNumber: r.chestNumber ?? "",
      name: r.name,
      teamName: r.teamName ?? "",
      dob: formatDob(r.dob, festivalTz),
      phone: r.phone ?? "",
    };
  });
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

export async function generateCallList(
  festivalId: string,
  config: CallListConfig,
  format: ExportFormat,
  festivalName: string,
  festivalTz: string = "UTC",
): Promise<GeneratedExport> {
  const rows = await loadCallRows(festivalId, config, festivalTz);

  const teamWise = config.listType === "TEAM_WISE";

  if (format === "CSV") {
    const header = [
      teamWise ? "Team" : "Competition",
      teamWise ? "Competition" : "Category",
      ...(config.includeChestNumber ? ["Chest No"] : []),
      "Name",
      ...(!teamWise && config.includeTeam ? ["Team"] : []),
      ...(config.includeDob ? ["DOB"] : []),
      ...(config.includePhone ? ["Phone"] : []),
    ];
    const body = rows.map((r) => [
      teamWise ? r.teamName : r.programmeName,
      teamWise ? r.programmeName : r.categoryName,
      ...(config.includeChestNumber ? [r.chestNumber] : []),
      r.name,
      ...(!teamWise && config.includeTeam ? [r.teamName] : []),
      ...(config.includeDob ? [r.dob] : []),
      ...(config.includePhone ? [r.phone] : []),
    ]);
    return {
      bytes: buildCsv([header, ...body]),
      fileName: "call-list.csv",
      mimeType: CSV_MIME,
      itemCount: rows.length,
    };
  }

  // PDF — grouped sections.
  const columns = [
    ...(config.includeChestNumber ? ["Chest"] : []),
    "Name",
    ...(teamWise ? ["Competition"] : config.includeTeam ? ["Team"] : []),
    ...(!teamWise && config.includeCategory ? ["Category"] : []),
    ...(config.includeDob ? ["DOB"] : []),
    ...(config.includePhone ? ["Phone"] : []),
  ];

  const grouped = groupBy(rows, (r) => (teamWise ? r.teamName : r.programmeId));
  const sections: PdfSection[] = [...grouped.entries()].map(([, groupRows]) => {
    const first = groupRows[0];
    const heading = teamWise ? first.teamName || "—" : first.programmeName;
    const subheading = teamWise
      ? `${groupRows.length} participants`
      : first.categoryName;
    return {
      heading,
      subheading,
      columns,
      rows: groupRows.map((r) => [
        ...(config.includeChestNumber ? [r.chestNumber] : []),
        r.name,
        ...(teamWise
          ? [r.programmeName]
          : config.includeTeam
            ? [r.teamName]
            : []),
        ...(!teamWise && config.includeCategory ? [r.categoryName] : []),
        ...(config.includeDob ? [r.dob] : []),
        ...(config.includePhone ? [r.phone] : []),
      ]),
    };
  });

  return {
    bytes: buildSectionedPdf({
      festivalName,
      title: teamWise ? "Team-wise Call List" : "Call List",
      sections,
      pageLayout: config.pageLayout,
      timezone: festivalTz,
    }),
    fileName: "call-list.pdf",
    mimeType: PDF_MIME,
    itemCount: rows.length,
  };
}
