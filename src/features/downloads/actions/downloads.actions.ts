"use server";

import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festivalDownload } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import type { Tier } from "@/core/types/app-enums";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { invalidatePublicFestivalCaches } from "@/features/festivals/services/public-cache-invalidation";
import { isEnabled } from "@/features/plan-features/services/feature-gate";
import { loadFeatureOverrides } from "@/features/plan-features/services/plan-features.service";

export async function getDownloadsAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const rows = await db.query.festivalDownload.findMany({
    where: eq(festivalDownload.festivalId, festivalId),
    orderBy: [desc(festivalDownload.createdAt)],
  });
  return rows;
}

export async function createDownloadAction(
  festivalId: string,
  data: {
    title: string;
    description?: string | null;
    fileUrl: string;
    fileType: "PDF" | "DOC" | "XLS" | "JPG" | "PNG" | "ZIP" | "OTHER";
    category: "SCHEDULE" | "RULES" | "FORMS" | "BROCHURE" | "RESULTS" | "OTHER";
    publishedAt?: Date | null;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const effectiveFeatures = await loadFeatureOverrides(festival.tier as Tier);
  const canManage = isEnabled(festival.tier, "downloads", effectiveFeatures);
  if (!canManage) {
    return {
      success: false,
      error: "Downloads is not available on your plan.",
    };
  }

  await db.insert(festivalDownload).values({
    id: randomUUID(),
    updatedAt: serverNowIso(),
    festivalId,
    title: data.title,
    description: data.description ?? null,
    fileUrl: data.fileUrl,
    fileType: data.fileType,
    category: data.category,
    publishedAt: data.publishedAt?.toISOString() ?? null,
  });

  revalidatePath(`/dashboard/${festival.slug}/content/downloads`);
  revalidatePath(`/${festival.slug}/downloads`);
  await invalidatePublicFestivalCaches({
    festivalId,
    slug: festival.slug,
  });
  return { success: true };
}

export async function updateDownloadAction(
  festivalId: string,
  downloadId: string,
  data: {
    title?: string;
    description?: string | null;
    fileUrl?: string;
    fileType?: "PDF" | "DOC" | "XLS" | "JPG" | "PNG" | "ZIP" | "OTHER";
    category?:
      | "SCHEDULE"
      | "RULES"
      | "FORMS"
      | "BROCHURE"
      | "RESULTS"
      | "OTHER";
    publishedAt?: Date | null;
  },
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const existing = await db.query.festivalDownload.findFirst({
    where: and(
      eq(festivalDownload.id, downloadId),
      eq(festivalDownload.festivalId, festivalId),
    ),
    columns: { id: true },
  });
  if (!existing) return { success: false, error: "Download not found" };

  await db
    .update(festivalDownload)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.fileUrl !== undefined && { fileUrl: data.fileUrl }),
      ...(data.fileType !== undefined && { fileType: data.fileType }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.publishedAt !== undefined && {
        publishedAt: data.publishedAt?.toISOString() ?? null,
      }),
      updatedAt: serverNowIso(),
    })
    .where(eq(festivalDownload.id, existing.id));

  revalidatePath(`/dashboard/${festival.slug}/content/downloads`);
  revalidatePath(`/${festival.slug}/downloads`);
  await invalidatePublicFestivalCaches({
    festivalId,
    slug: festival.slug,
  });
  return { success: true };
}

export async function deleteDownloadAction(
  festivalId: string,
  downloadId: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const festival = await findFestivalById(festivalId);
  if (!festival) return { success: false, error: "Festival not found" };

  const existing = await db.query.festivalDownload.findFirst({
    where: and(
      eq(festivalDownload.id, downloadId),
      eq(festivalDownload.festivalId, festivalId),
    ),
    columns: { id: true },
  });
  if (!existing) return { success: false, error: "Download not found" };

  await db.delete(festivalDownload).where(eq(festivalDownload.id, existing.id));

  revalidatePath(`/dashboard/${festival.slug}/content/downloads`);
  revalidatePath(`/${festival.slug}/downloads`);
  await invalidatePublicFestivalCaches({
    festivalId,
    slug: festival.slug,
  });
  return { success: true };
}
