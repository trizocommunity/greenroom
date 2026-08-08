"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  category as categoryTable,
  festival as festivalTable,
  group as groupTable,
  participant as participantTable,
  programmeAssignment,
  programmeCodeLetter,
  programme as programmeTable,
  result as resultTable,
} from "@/core/database/schema";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import * as PosterTemplateRepo from "@/features/posters/repositories/poster-template.repository";
import * as AssignmentRepo from "@/features/posters/repositories/template-assignment.repository";
import {
  buildResultPosterBindings,
  type ResultPosterBindingInput,
} from "@/features/posters/services/poster-bindings.service";
import type { PosterTemplateRecord } from "@/features/posters/types/poster-template.types";
import { requireProgrammeType } from "@/features/programmes/utils/assert-programme-type";

export interface ResultPosterExportPayload {
  programmeId: string;
  programmeName: string;
  categoryName: string;
  festivalName: string;
  publishedTemplateCodes: string[];
  bindings: ResultPosterBindingInput;
  templates: PosterTemplateRecord[];
  assignedTemplateCode: string | null;
}

export async function getResultPosterExportPayloadAction(
  programmeId: string,
): Promise<ActionResponse<ResultPosterExportPayload | null>> {
  try {
    const session = await getSession();
    const programme = await db.query.programme.findFirst({
      where: eq(programmeTable.id, programmeId),
      columns: {
        id: true,
        name: true,
        festivalId: true,
        resultNumber: true,
      },
    });
    if (!programme) throw new AppError(ERROR_MESSAGES.PROGRAMME_NOT_FOUND);

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, programme.festivalId),
      columns: { id: true, name: true, slug: true },
    });
    if (!festival) throw new AppError(ERROR_MESSAGES.FESTIVAL_NOT_FOUND);

    if (session?.userId) {
      await assertFestivalAccess(session, festival.id);
    }

    const category = await db
      .select({ name: categoryTable.name })
      .from(programmeTable)
      .innerJoin(categoryTable, eq(programmeTable.categoryId, categoryTable.id))
      .where(eq(programmeTable.id, programmeId))
      .limit(1);
    const categoryName = category[0]?.name ?? "";

    const progMeta = await db.query.programme.findFirst({
      where: eq(programmeTable.id, programmeId),
      columns: { type: true },
    });

    const rows = await db
      .select({
        position: resultTable.position,
        grade: resultTable.grade,
        points: resultTable.points,
        participantName: participantTable.name,
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
      .leftJoin(
        participantTable,
        eq(programmeAssignment.participantId, participantTable.id),
      )
      .leftJoin(groupTable, eq(programmeAssignment.groupId, groupTable.id))
      .where(
        and(
          eq(programmeAssignment.programmeId, programmeId),
          eq(resultTable.isPublished, true),
        ),
      )
      .orderBy(asc(resultTable.position));

    if (rows.length === 0) {
      return { success: true, data: null };
    }

    const programmeType = requireProgrammeType(
      progMeta?.type ?? rows[0]?.programmeType,
      `poster export: programme ${programmeId}`,
    );
    const winners = rows.map((r) => ({
      position: r.position ?? 0,
      name:
        programmeType === "GROUP"
          ? (r.groupName ?? "Team")
          : (r.participantName ?? r.groupName ?? "—"),
      team: r.groupName ?? "—",
      grade: r.grade,
      points: r.points ?? 0,
    }));

    const published = await PosterTemplateRepo.listPublishedResultTemplates(
      festival.id,
    );
    if (published.length === 0) {
      return { success: true, data: null };
    }

    const codeLetter = await db.query.programmeCodeLetter.findFirst({
      where: eq(programmeCodeLetter.programmeId, programmeId),
      columns: { code: true },
      orderBy: [desc(programmeCodeLetter.issuedAt)],
    });

    const bindingInput: ResultPosterBindingInput = {
      festivalName: festival.name,
      programmeName: programme.name,
      categoryName,
      programmeResultCode: codeLetter?.code ?? null,
      resultNumber: programme.resultNumber,
      winners,
    };

    const assignments = await AssignmentRepo.listByKind(
      festival.id,
      "RESULT_RANGE",
    );

    let assignedTemplateCode: string | null = null;
    if (programme.resultNumber !== null) {
      for (const a of assignments) {
        if (
          a.fromResultNo !== null &&
          a.toResultNo !== null &&
          programme.resultNumber >= a.fromResultNo &&
          programme.resultNumber <= a.toResultNo
        ) {
          assignedTemplateCode = a.templateCode;
          break;
        }
      }
    }

    // Default to the first published template if none assigned, to avoid breaking legacy behaviour
    if (!assignedTemplateCode && published.length > 0) {
      assignedTemplateCode = published[0].code;
    }

    return {
      success: true,
      data: {
        programmeId,
        programmeName: programme.name,
        categoryName,
        festivalName: festival.name,
        publishedTemplateCodes: published.map((p) => p.code),
        bindings: bindingInput,
        templates: published,
        assignedTemplateCode,
      },
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getPublicResultPosterPayloadAction(
  programmeId: string,
  festivalSlug: string,
): Promise<ActionResponse<ResultPosterExportPayload | null>> {
  try {
    void festivalSlug;
    const programme = await db.query.programme.findFirst({
      where: eq(programmeTable.id, programmeId),
      columns: { id: true, name: true, festivalId: true },
    });
    if (!programme) return { success: true, data: null };

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, programme.festivalId),
      columns: { id: true, name: true },
    });
    if (!festival) return { success: true, data: null };

    const hasPublished = await db
      .select({ id: resultTable.id })
      .from(resultTable)
      .innerJoin(
        programmeAssignment,
        eq(resultTable.assignmentId, programmeAssignment.id),
      )
      .where(
        and(
          eq(programmeAssignment.programmeId, programmeId),
          eq(resultTable.isPublished, true),
        ),
      )
      .limit(1);

    if (hasPublished.length === 0) {
      return { success: true, data: null };
    }

    return getResultPosterExportPayloadAction(programmeId);
  } catch (error) {
    return handleActionError(error);
  }
}
