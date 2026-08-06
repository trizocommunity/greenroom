import { db } from "@/core/database/client";
import {
  generalEntry,
  generalEntryAward,
  generalEntryCategory,
} from "@/core/database/schema";
import { and, eq, inArray } from "drizzle-orm";
import { generateId } from "@/core/database/ids";
import { AppError } from "@/core/errors/errors";
import { currentTimestampSql } from "@/core/datetime";

export async function assertNotPublished(generalEntryId: string) {
  const publishedAwards = await db
    .select({ id: generalEntryAward.id })
    .from(generalEntryAward)
    .where(
      and(
        eq(generalEntryAward.generalEntryId, generalEntryId),
        eq(generalEntryAward.isPublished, true)
      )
    );

  if (publishedAwards.length > 0) {
    throw new AppError("Cannot modify a general entry that has published awards.");
  }
}

export async function createGeneralEntryCategory(input: {
  festivalId: string;
  name: string;
  createdByName?: string | null;
  createdByEmail?: string | null;
}) {
  const id = generateId();
  await db.insert(generalEntryCategory).values({
    id,
    festivalId: input.festivalId,
    name: input.name,
    createdByName: input.createdByName,
    createdByEmail: input.createdByEmail,
  });
  return id;
}

export async function updateGeneralEntryCategory(id: string, name: string) {
  await db
    .update(generalEntryCategory)
    .set({
      name,
      updatedAt: currentTimestampSql(),
    })
    .where(eq(generalEntryCategory.id, id));
}

export async function deleteGeneralEntryCategory(id: string) {
  const entriesUsingCategory = await db
    .select({ id: generalEntry.id })
    .from(generalEntry)
    .where(eq(generalEntry.categoryId, id))
    .limit(1);

  if (entriesUsingCategory.length > 0) {
    throw new AppError("Cannot delete category because it contains general entries.");
  }

  await db.delete(generalEntryCategory).where(eq(generalEntryCategory.id, id));
}

export async function createGeneralEntry(input: {
  festivalId: string;
  name: string;
  categoryId: string | null;
  type?: string;
  remarks?: string | null;
  awards: { groupId: string; points: number }[];
  createdByName?: string | null;
  createdByEmail?: string | null;
}) {
  const entryId = generateId();

  await db.transaction(async (tx) => {
    await tx.insert(generalEntry).values({
      id: entryId,
      festivalId: input.festivalId,
      name: input.name,
      categoryId: input.categoryId,
      type: input.type || "GENERAL",
      remarks: input.remarks || null,
      createdByName: input.createdByName,
      createdByEmail: input.createdByEmail,
    });

    if (input.awards.length > 0) {
      const awardValues = input.awards.map((a) => ({
        id: generateId(),
        generalEntryId: entryId,
        groupId: a.groupId,
        points: a.points,
      }));
      await tx.insert(generalEntryAward).values(awardValues);
    }
  });

  return entryId;
}

export async function updateGeneralEntry(input: {
  id: string;
  name: string;
  categoryId: string | null;
  type?: string;
  remarks?: string | null;
  awards: { groupId: string; points: number }[];
}) {
  await assertNotPublished(input.id);

  await db.transaction(async (tx) => {
    await tx
      .update(generalEntry)
      .set({
        name: input.name,
        categoryId: input.categoryId,
        type: input.type || "GENERAL",
        remarks: input.remarks || null,
        updatedAt: currentTimestampSql(),
      })
      .where(eq(generalEntry.id, input.id));

    await tx
      .delete(generalEntryAward)
      .where(eq(generalEntryAward.generalEntryId, input.id));

    if (input.awards.length > 0) {
      const awardValues = input.awards.map((a) => ({
        id: generateId(),
        generalEntryId: input.id,
        groupId: a.groupId,
        points: a.points,
      }));
      await tx.insert(generalEntryAward).values(awardValues);
    }
  });
}

export async function deleteGeneralEntry(id: string) {
  await assertNotPublished(id);
  await db.delete(generalEntry).where(eq(generalEntry.id, id));
}

export async function setGeneralEntryPublished(
  generalEntryId: string,
  isPublished: boolean,
  sessionInfo?: { name?: string | null; email?: string | null }
) {
  await db
    .update(generalEntryAward)
    .set({
      isPublished,
      publishedAt: isPublished ? currentTimestampSql() : null,
      publishedByName: isPublished ? sessionInfo?.name : null,
      publishedByEmail: isPublished ? sessionInfo?.email : null,
      updatedAt: currentTimestampSql(),
    })
    .where(eq(generalEntryAward.generalEntryId, generalEntryId));
}
