"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { user } from "@/core/database/schema";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import {
  createGeneralEntryCategorySchema,
  createGeneralEntrySchema,
  updateGeneralEntryCategorySchema,
  updateGeneralEntrySchema,
} from "../schemas/general-entries.schema";
import {
  createGeneralEntry,
  createGeneralEntryCategory,
  deleteGeneralEntry,
  deleteGeneralEntryCategory,
  setGeneralEntryPublished,
  updateGeneralEntry,
  updateGeneralEntryCategory,
} from "../services/general-entries.service";

export async function createGeneralEntryCategoryAction(
  input: z.infer<typeof createGeneralEntryCategorySchema>,
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = createGeneralEntryCategorySchema.parse(input);
  await assertFestivalAccess(session, parsed.festivalId, {
    requireWritable: true,
  });

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.userId),
    columns: { name: true, email: true },
  });

  const id = await createGeneralEntryCategory({
    ...parsed,
    createdByName: dbUser?.name,
    createdByEmail: dbUser?.email,
  });

  await createAuditLog({
    action: "CREATE_GENERAL_ENTRY_CATEGORY",
    targetType: "GENERAL_ENTRY_CATEGORY",
    targetId: id,
    metadata: { name: parsed.name },
  });

  revalidatePath(`/dashboard/[slug]/event-works/general-entries`, "page");
  return { id };
}

export async function updateGeneralEntryCategoryAction(
  festivalId: string,
  input: z.infer<typeof updateGeneralEntryCategorySchema>,
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = updateGeneralEntryCategorySchema.parse(input);
  await assertFestivalAccess(session, festivalId, {
    requireWritable: true,
  });

  await updateGeneralEntryCategory(parsed.id, parsed.name);

  await createAuditLog({
    action: "UPDATE_GENERAL_ENTRY_CATEGORY",
    targetType: "GENERAL_ENTRY_CATEGORY",
    targetId: parsed.id,
    metadata: { name: parsed.name },
  });

  revalidatePath(`/dashboard/[slug]/event-works/general-entries`, "page");
}

export async function deleteGeneralEntryCategoryAction(
  festivalId: string,
  categoryId: string,
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  await assertFestivalAccess(session, festivalId, {
    requireWritable: true,
  });

  await deleteGeneralEntryCategory(categoryId);

  await createAuditLog({
    action: "DELETE_GENERAL_ENTRY_CATEGORY",
    targetType: "GENERAL_ENTRY_CATEGORY",
    targetId: categoryId,
  });

  revalidatePath(`/dashboard/[slug]/event-works/general-entries`, "page");
}

export async function createGeneralEntryAction(
  input: z.infer<typeof createGeneralEntrySchema>,
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = createGeneralEntrySchema.parse(input);
  await assertFestivalAccess(session, parsed.festivalId, {
    requireWritable: true,
  });

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.userId),
    columns: { name: true, email: true },
  });

  const id = await createGeneralEntry({
    ...parsed,
    createdByName: dbUser?.name,
    createdByEmail: dbUser?.email,
  });

  await createAuditLog({
    action: "CREATE_GENERAL_ENTRY",
    targetType: "GENERAL_ENTRY",
    targetId: id,
    metadata: { name: parsed.name },
  });

  revalidatePath(`/dashboard/[slug]/event-works/general-entries`, "page");
  return { id };
}

export async function updateGeneralEntryAction(
  festivalId: string,
  input: z.infer<typeof updateGeneralEntrySchema>,
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = updateGeneralEntrySchema.parse(input);
  await assertFestivalAccess(session, festivalId, {
    requireWritable: true,
  });

  await updateGeneralEntry(parsed);

  await createAuditLog({
    action: "UPDATE_GENERAL_ENTRY",
    targetType: "GENERAL_ENTRY",
    targetId: parsed.id,
    metadata: { name: parsed.name },
  });

  revalidatePath(`/dashboard/[slug]/event-works/general-entries`, "page");
}

export async function deleteGeneralEntryAction(
  festivalId: string,
  generalEntryId: string,
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  await assertFestivalAccess(session, festivalId, {
    requireWritable: true,
  });

  await deleteGeneralEntry(generalEntryId);

  await createAuditLog({
    action: "DELETE_GENERAL_ENTRY",
    targetType: "GENERAL_ENTRY",
    targetId: generalEntryId,
  });

  revalidatePath(`/dashboard/[slug]/event-works/general-entries`, "page");
}

export async function publishGeneralEntryAction(
  festivalId: string,
  generalEntryId: string,
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  await assertFestivalAccess(session, festivalId, {
    requireWritable: true,
  });

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.userId),
    columns: { name: true, email: true },
  });

  await setGeneralEntryPublished(generalEntryId, true, dbUser ?? undefined);

  await createAuditLog({
    action: "PUBLISH_GENERAL_ENTRY",
    targetType: "GENERAL_ENTRY",
    targetId: generalEntryId,
  });

  revalidatePath(`/dashboard/[slug]/event-works/general-entries`, "page");
  revalidatePath(`/dashboard/[slug]/event-works/results`, "page");
}

export async function unpublishGeneralEntryAction(
  festivalId: string,
  generalEntryId: string,
) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  await assertFestivalAccess(session, festivalId, {
    requireWritable: true,
  });

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.userId),
    columns: { name: true, email: true },
  });

  await setGeneralEntryPublished(generalEntryId, false, dbUser ?? undefined);

  await createAuditLog({
    action: "UNPUBLISH_GENERAL_ENTRY",
    targetType: "GENERAL_ENTRY",
    targetId: generalEntryId,
  });

  revalidatePath(`/dashboard/[slug]/event-works/general-entries`, "page");
  revalidatePath(`/dashboard/[slug]/event-works/results`, "page");
}
