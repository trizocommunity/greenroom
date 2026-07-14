"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
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
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import * as PosterTemplateRepo from "@/features/posters/repositories/poster-template.repository";
import {
  buildResultPosterBindings,
  type ResultPosterBindingInput,
} from "@/features/posters/services/poster-bindings.service";
import type { PosterTemplateRecord } from "@/features/posters/types/poster-template.types";

export interface ResultPosterExportPayload {
  programmeId: string;
  programmeName: string;
  categoryName: string;
  festivalName: string;
  defaultTemplateCode: string | null;
  publishedTemplateCodes: string[];
  bindings: ResultPosterBindingInput;
  templates: PosterTemplateRecord[];
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
        resultPosterTemplateCode: true,
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
      .leftJoin(
        studentTable,
        eq(programmeAssignment.studentId, studentTable.id),
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

    const programmeType =
      progMeta?.type ?? rows[0]?.programmeType ?? "INDIVIDUAL";
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
      winners,
    };

    return {
      success: true,
      data: {
        programmeId,
        programmeName: programme.name,
        categoryName,
        festivalName: festival.name,
        defaultTemplateCode: programme.resultPosterTemplateCode,
        publishedTemplateCodes: published.map((p) => p.code),
        bindings: bindingInput,
        templates: published,
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
  void festivalSlug;
  return getResultPosterExportPayloadAction(programmeId);
}
