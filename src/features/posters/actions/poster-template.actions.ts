"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PosterEditorDocument } from "@/components/editor/poster-editor-types";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import {
  ensureFestivalWritable,
  getFestivalContext,
} from "@/features/festivals/services/festival-context.service";
import { canManageTemplates } from "@/features/posters/auth/poster-access";
import * as PosterTemplateRepo from "@/features/posters/repositories/poster-template.repository";
import {
  type EditorPreviewBindingsPayload,
  getFestivalEditorPreviewBindings,
} from "@/features/posters/services/poster-editor-preview.service";
import type {
  PosterTemplateListItem,
  PosterTemplateRecord,
  PosterTemplateType,
} from "@/features/posters/types/poster-template.types";
import { toPosterTemplateListItem } from "@/features/posters/utils/poster-template-list-summary";
import {
  isResultSlotCode,
  templateTypeFromCode,
  validateTemplateCode,
} from "@/features/posters/utils/template-code";

const saveDraftSchema = z.object({
  festivalId: z.string(),
  code: z.string(),
  document: z.custom<PosterEditorDocument>(),
  backgroundUrl: z.string().nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

async function assertTemplatesAccess(festivalId: string) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  await assertFestivalAccess(session, festivalId, { requireWritable: true });
  await ensureFestivalWritable(festivalId);

  const ctx = await getFestivalContext({
    slugOrId: festivalId,
    userId: session.userId,
    globalRole: session.role,
  });
  if (!ctx || !canManageTemplates(ctx.role)) {
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
  }
  return session;
}

function revalidatePosterPaths(slug: string) {
  revalidatePath(`/dashboard/${slug}/templates`);
  revalidatePath(`/${slug}/editor`);
  revalidatePath(`/${slug}/results`);
  revalidatePath(`/${slug}`);
}

export async function getEditorPreviewBindingsAction(
  festivalId: string,
  templateType: PosterTemplateType,
): Promise<ActionResponse<EditorPreviewBindingsPayload>> {
  try {
    await assertTemplatesAccess(festivalId);
    const payload = await getFestivalEditorPreviewBindings(
      festivalId,
      templateType,
    );
    return { success: true, data: payload };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function listPosterTemplatesAction(
  festivalId: string,
): Promise<ActionResponse<PosterTemplateListItem[]>> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    await assertFestivalAccess(session, festivalId);
    const ctx = await getFestivalContext({
      slugOrId: festivalId,
      userId: session.userId,
      globalRole: session.role,
    });
    if (!ctx || !canManageTemplates(ctx.role)) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }
    const rows = await PosterTemplateRepo.listByFestival(festivalId);
    return {
      success: true,
      data: rows.map(toPosterTemplateListItem),
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getPosterTemplateAction(
  festivalId: string,
  code: string,
): Promise<ActionResponse<PosterTemplateRecord | null>> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    await assertFestivalAccess(session, festivalId);
    const ctx = await getFestivalContext({
      slugOrId: festivalId,
      userId: session.userId,
      globalRole: session.role,
    });
    if (!ctx || !canManageTemplates(ctx.role)) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }
    const row = await PosterTemplateRepo.findByFestivalAndCode(
      festivalId,
      code,
    );
    return { success: true, data: row };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getPublishedResultTemplatesAction(
  festivalId: string,
): Promise<ActionResponse<PosterTemplateListItem[]>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: true, data: [] };
    }
    await assertFestivalAccess(session, festivalId);
    const rows =
      await PosterTemplateRepo.listPublishedResultTemplates(festivalId);
    return {
      success: true,
      data: rows.map(toPosterTemplateListItem),
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function savePosterTemplateDraftAction(
  input: z.infer<typeof saveDraftSchema>,
  festivalSlug: string,
): Promise<ActionResponse<{ id: string; code: string }>> {
  try {
    const parsed = saveDraftSchema.parse(input);
    await assertTemplatesAccess(parsed.festivalId);

    const codeError = validateTemplateCode(parsed.code);
    if (codeError) return { success: false, error: codeError };

    const type = templateTypeFromCode(parsed.code);
    if (!type) return { success: false, error: "Invalid template code" };
    if (type === "TEAM_POINTS") {
      return {
        success: false,
        error: "Team points templates are no longer supported.",
      };
    }

    const doc = parsed.document;
    const existing = await PosterTemplateRepo.findByFestivalAndCode(
      parsed.festivalId,
      parsed.code,
    );
    const id = existing?.id ?? randomUUID();
    await PosterTemplateRepo.upsertTemplate({
      id,
      festivalId: parsed.festivalId,
      type,
      code: parsed.code,
      status: existing?.status ?? "DRAFT",
      width: doc.width,
      height: doc.height,
      konvaJson: doc,
      backgroundUrl: parsed.backgroundUrl ?? doc.background?.imageUrl ?? null,
      meta: parsed.meta ?? null,
    });

    revalidatePosterPaths(festivalSlug);
    return { success: true, data: { id, code: parsed.code } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function publishPosterTemplateAction(
  festivalId: string,
  code: string,
  festivalSlug: string,
): Promise<ActionResponse<void>> {
  try {
    await assertTemplatesAccess(festivalId);
    const codeError = validateTemplateCode(code);
    if (codeError) return { success: false, error: codeError };

    const existing = await PosterTemplateRepo.findByFestivalAndCode(
      festivalId,
      code,
    );
    if (!existing) {
      return { success: false, error: "Save a draft before publishing" };
    }

    if (existing.type === "TEAM_POINTS") {
      return {
        success: false,
        error: "Team points templates are no longer supported.",
      };
    }

    if (existing.type === "RESULT" && isResultSlotCode(code)) {
      const published =
        await PosterTemplateRepo.listPublishedResultTemplates(festivalId);
      const alreadyThisSlot = published.some((p) => p.code === code);
      if (!alreadyThisSlot && published.length >= 2) {
        return {
          success: false,
          error:
            "Both RESULT-A and RESULT-B are already published. Unpublish one first.",
        };
      }
    }

    await PosterTemplateRepo.updateStatus(festivalId, code, "PUBLISHED");
    revalidatePosterPaths(festivalSlug);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function unpublishPosterTemplateAction(
  festivalId: string,
  code: string,
  festivalSlug: string,
): Promise<ActionResponse<void>> {
  try {
    await assertTemplatesAccess(festivalId);
    await PosterTemplateRepo.updateStatus(festivalId, code, "DRAFT");
    revalidatePosterPaths(festivalSlug);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deletePosterTemplateDraftAction(
  festivalId: string,
  code: string,
  festivalSlug: string,
): Promise<ActionResponse<void>> {
  try {
    await assertTemplatesAccess(festivalId);
    const existing = await PosterTemplateRepo.findByFestivalAndCode(
      festivalId,
      code,
    );
    if (!existing) return { success: true, data: undefined };
    if (existing.status === "PUBLISHED") {
      return {
        success: false,
        error: "Unpublish before deleting a published template",
      };
    }
    await PosterTemplateRepo.deleteByCode(festivalId, code);
    revalidatePosterPaths(festivalSlug);
    return { success: true, data: undefined };
  } catch (error) {
    return handleActionError(error);
  }
}

/** Removes every poster template row for this festival (drafts + published). */
export async function clearAllPosterTemplatesAction(
  festivalId: string,
  festivalSlug: string,
): Promise<ActionResponse<{ deletedCount: number }>> {
  try {
    await assertTemplatesAccess(festivalId);
    const existing = await PosterTemplateRepo.listByFestival(festivalId);
    const count = existing.length;
    await PosterTemplateRepo.deleteAllByFestival(festivalId);
    revalidatePosterPaths(festivalSlug);
    return { success: true, data: { deletedCount: count } };
  } catch (error) {
    return handleActionError(error);
  }
}
