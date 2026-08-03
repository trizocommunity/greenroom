import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import type { PosterEditorDocument } from "@/components/editor/poster-editor-types";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  group as groupTable,
  participant as participantTable,
  programmeAssignment,
  programme as programmeTable,
  result as resultTable,
} from "@/core/database/schema";
import type {
  BadgeConfig,
  CertificateConfig,
} from "@/features/exports/schemas/export-config.schema";
import * as PosterTemplateRepo from "@/features/posters/repositories/poster-template.repository";
import {
  buildCandidateCardBindings,
  type PosterBindings,
} from "@/features/posters/services/poster-bindings.service";

export interface TemplateExportItem {
  bindings: PosterBindings;
}

export interface TemplateExportPayload {
  doc: PosterEditorDocument;
  width: number;
  height: number;
  quality: "SCREEN" | "STANDARD" | "PRINT";
  printLayout: "ONE_PER_PAGE" | "MULTIPLE_PER_PAGE";
  items: TemplateExportItem[];
}

async function loadTemplateDoc(
  festivalId: string,
  templateId: string,
): Promise<PosterEditorDocument> {
  const all = await PosterTemplateRepo.listByFestival(festivalId);
  const template = all.find(
    (t) => t.id === templateId || t.code === templateId,
  );
  if (!template) throw new Error("Selected template was not found.");
  return template.konvaJson;
}

const CERT_TYPE_LABELS: Record<string, string> = {
  PARTICIPATION: "Participation",
  FIRST: "First Place",
  SECOND: "Second Place",
  THIRD: "Third Place",
  COMMON_PRIZE: "Common Prize",
  GRADE: "Grade",
};

const CERT_TITLE_MAP: Record<string, string> = {
  PARTICIPATION: "Certificate of Participation",
  FIRST: "Certificate of First Place",
  SECOND: "Certificate of Second Place",
  THIRD: "Certificate of Third Place",
  COMMON_PRIZE: "Certificate of Common Prize",
  GRADE: "Certificate of Grade",
};

export async function resolveBadgePayload(
  festivalId: string,
  config: BadgeConfig,
  festivalName: string,
): Promise<TemplateExportPayload> {
  const doc = await loadTemplateDoc(festivalId, config.templateId);

  const conditions = [eq(participantTable.festivalId, festivalId)];
  if (config.gender !== "ALL")
    conditions.push(eq(participantTable.gender, config.gender));
  if (config.categoryIds.length)
    conditions.push(inArray(participantTable.categoryId, config.categoryIds));
  if (config.teamIds.length)
    conditions.push(inArray(participantTable.groupId, config.teamIds));

  const rows = await db
    .select({
      name: participantTable.name,
      chestNumber: participantTable.chestNumber,
      profileSlug: participantTable.profileSlug,
      teamName: groupTable.name,
      categoryName: categoryTable.name,
    })
    .from(participantTable)
    .leftJoin(groupTable, eq(participantTable.groupId, groupTable.id))
    .leftJoin(categoryTable, eq(participantTable.categoryId, categoryTable.id))
    .where(and(...conditions));

  const items: TemplateExportItem[] = rows
    .filter((r) => (config.onlyWithChestNumber ? !!r.chestNumber : true))
    .map((r) => ({
      bindings: buildCandidateCardBindings({
        festivalName,
        participantName: r.name,
        chestNumber: r.chestNumber ?? "",
        teamName: r.teamName ?? "",
        categoryName: r.categoryName ?? "",
        qrPayload: r.profileSlug ?? r.chestNumber ?? r.name,
      }),
    }));

  return {
    doc,
    width: doc.width,
    height: doc.height,
    quality: config.quality,
    printLayout: config.printLayout,
    items,
  };
}

export async function resolveCertificatePayload(
  festivalId: string,
  config: CertificateConfig,
  festivalName: string,
): Promise<TemplateExportPayload> {
  const doc = await loadTemplateDoc(festivalId, config.templateId);
  const items: TemplateExportItem[] = [];
  const types = new Set(config.certificateTypes);

  const baseBindings = (extra: PosterBindings): PosterBindings => ({
    festName: festivalName,
    ...extra,
  });

  // Participation certificates: one per participant in scope.
  if (types.has("PARTICIPATION")) {
    const conditions = [eq(participantTable.festivalId, festivalId)];
    if (config.categoryIds.length)
      conditions.push(inArray(participantTable.categoryId, config.categoryIds));
    const rows = await db
      .select({
        name: participantTable.name,
        teamName: groupTable.name,
        categoryName: categoryTable.name,
      })
      .from(participantTable)
      .leftJoin(groupTable, eq(participantTable.groupId, groupTable.id))
      .leftJoin(
        categoryTable,
        eq(participantTable.categoryId, categoryTable.id),
      )
      .where(and(...conditions));
    for (const r of rows) {
      items.push({
        bindings: baseBindings({
          participantName: r.name,
          teamName: r.teamName ?? "",
          categoryName: r.categoryName ?? "",
          certificateType: CERT_TYPE_LABELS.PARTICIPATION,
          certificateTitle: CERT_TITLE_MAP.PARTICIPATION,
        }),
      });
    }
  }

  // Placement / grade certificates: from published results.
  const placementPositions: Record<string, number> = {
    FIRST: 1,
    SECOND: 2,
    THIRD: 3,
  };
  const wantPlacements = (["FIRST", "SECOND", "THIRD"] as const).filter((t) =>
    types.has(t),
  );

  if (wantPlacements.length || types.has("GRADE")) {
    const conditions = [
      eq(resultTable.festivalId, festivalId),
      eq(resultTable.isPublished, true),
    ];
    if (config.programmeIds.length)
      conditions.push(inArray(programmeTable.id, config.programmeIds));
    if (config.categoryIds.length)
      conditions.push(inArray(programmeTable.categoryId, config.categoryIds));

    const rows = await db
      .select({
        programmeName: programmeTable.name,
        categoryName: categoryTable.name,
        programmeType: programmeTable.type,
        participantName: participantTable.name,
        teamName: groupTable.name,
        position: resultTable.position,
        grade: resultTable.grade,
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
      .where(and(...conditions));

    for (const r of rows) {
      const name =
        r.programmeType === "GROUP"
          ? (r.teamName ?? "Team")
          : (r.participantName ?? r.teamName ?? "");
      const wonPlacement = wantPlacements.find(
        (t) => placementPositions[t] === r.position,
      );
      if (wonPlacement) {
        items.push({
          bindings: baseBindings({
            participantName: name,
            teamName: r.teamName ?? "",
            categoryName: r.categoryName ?? "",
            programmeName: r.programmeName,
            certificateType: CERT_TYPE_LABELS[wonPlacement],
            certificateTitle: CERT_TITLE_MAP[wonPlacement] ?? "Certificate",
            position: String(r.position ?? ""),
          }),
        });
      } else if (types.has("GRADE") && r.grade) {
        items.push({
          bindings: baseBindings({
            participantName: name,
            teamName: r.teamName ?? "",
            categoryName: r.categoryName ?? "",
            programmeName: r.programmeName,
            certificateType: CERT_TYPE_LABELS.GRADE,
            certificateTitle: CERT_TITLE_MAP.GRADE,
            grade: r.grade,
          }),
        });
      }
    }
  }

  return {
    doc,
    width: doc.width,
    height: doc.height,
    quality: config.quality,
    printLayout: config.printLayout,
    items,
  };
}
