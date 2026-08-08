"use server";

import { and, eq } from "drizzle-orm";
import type { PosterEditorDocument } from "@/components/editor/poster-editor-types";
import { db } from "@/core/database/client";
import {
  festivalPosterTemplate,
  festival as festivalTable,
} from "@/core/database/schema";
import { handleActionError } from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import * as AssignmentRepo from "@/features/posters/repositories/template-assignment.repository";

export interface BadgePayload {
  templateCode: string;
  doc: PosterEditorDocument;
  bindings: Record<string, string>;
}

export async function getBadgePayloadAction(input: {
  festivalId: string;
  festivalName: string;
  participantName: string;
  chestNumber: string;
  teamName: string;
  categoryName: string;
  qrPayload: string;
}): Promise<ActionResponse<BadgePayload | null>> {
  try {
    const badgeCode = await AssignmentRepo.resolveActiveBadge(input.festivalId);
    if (!badgeCode) return { success: true, data: null };

    const template = await db.query.festivalPosterTemplate.findFirst({
      where: and(
        eq(festivalPosterTemplate.festivalId, input.festivalId),
        eq(festivalPosterTemplate.code, badgeCode),
        eq(festivalPosterTemplate.status, "PUBLISHED"),
      ),
    });
    if (!template) return { success: true, data: null };

    const { buildCandidateCardBindings } = await import(
      "@/features/posters/services/poster-bindings.service"
    );

    const bindings = buildCandidateCardBindings({
      festivalName: input.festivalName,
      participantName: input.participantName,
      chestNumber: input.chestNumber,
      teamName: input.teamName,
      qrPayload: input.qrPayload,
      categoryName: input.categoryName,
    });

    return {
      success: true,
      data: {
        templateCode: badgeCode,
        doc: template.konvaJson as PosterEditorDocument,
        bindings,
      },
    };
  } catch (error) {
    return handleActionError(error);
  }
}
