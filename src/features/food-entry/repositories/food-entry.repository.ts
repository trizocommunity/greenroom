import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  notInArray,
  sql,
} from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category,
  festival,
  foodHallEntry,
  foodHallSession,
  foodHallSlot,
  group,
  participant,
} from "@/core/database/schema";

export async function getFoodSlots(festivalId: string) {
  return await db.query.foodHallSlot.findMany({
    where: eq(foodHallSlot.festivalId, festivalId),
    orderBy: [asc(foodHallSlot.slotOrder)],
  });
}

export async function getGroupsAndCategoriesForFestival(festivalId: string) {
  const groups = await db
    .select({ id: group.id, name: group.name })
    .from(group)
    .where(eq(group.festivalId, festivalId))
    .orderBy(asc(group.name));

  const categories = await db
    .select({ id: category.id, name: category.name })
    .from(category)
    .where(eq(category.festivalId, festivalId))
    .orderBy(asc(category.name));

  return { groups, categories };
}

export async function getFoodSessionsWithStats(
  festivalId: string,
  fromDate?: string,
  toDate?: string,
) {
  // Query to get sessions and join with slots and count entries
  // For simplicity and efficiency, we can do a raw SQL or a query builder approach.

  const conditions = [eq(foodHallSession.festivalId, festivalId)];
  if (fromDate) conditions.push(gte(foodHallSession.sessionDate, fromDate));
  if (toDate) conditions.push(lte(foodHallSession.sessionDate, toDate));

  const sessions = await db
    .select({
      id: foodHallSession.id,
      festivalId: foodHallSession.festivalId,
      slotId: foodHallSession.slotId,
      sessionDate: foodHallSession.sessionDate,
      status: foodHallSession.status,
      slotName: foodHallSlot.name,
      windowStartMin: foodHallSlot.windowStartMin,
      windowEndMin: foodHallSlot.windowEndMin,
      slotOrder: foodHallSlot.slotOrder,
      scannedCount: sql<number>`cast(count(${foodHallEntry.id}) as int)`,
    })
    .from(foodHallSession)
    .innerJoin(foodHallSlot, eq(foodHallSession.slotId, foodHallSlot.id))
    .leftJoin(foodHallEntry, eq(foodHallSession.id, foodHallEntry.sessionId))
    .where(and(...conditions))
    .groupBy(foodHallSession.id, foodHallSlot.id)
    .orderBy(asc(foodHallSession.sessionDate), asc(foodHallSlot.slotOrder));

  return sessions;
}

export async function getSessionById(sessionId: string) {
  return await db.query.foodHallSession.findFirst({
    where: eq(foodHallSession.id, sessionId),
    with: {
      slot: true,
    },
  });
}

export async function getSessionEntries(sessionId: string) {
  return await db
    .select({
      id: foodHallEntry.id,
      chestNumber: foodHallEntry.chestNumber,
      scannedAt: foodHallEntry.scannedAt,
      scannedByName: foodHallEntry.scannedByName,
      participantId: participant.id,
      participantName: participant.name,
      groupName: group.name,
      categoryName: category.name,
    })
    .from(foodHallEntry)
    .innerJoin(participant, eq(foodHallEntry.participantId, participant.id))
    .leftJoin(group, eq(participant.groupId, group.id))
    .leftJoin(category, eq(participant.categoryId, category.id))
    .where(eq(foodHallEntry.sessionId, sessionId))
    .orderBy(desc(foodHallEntry.scannedAt));
}

export async function getEntriesBySlotAndDate(
  festivalId: string,
  slotId: string,
  date: string,
  groupId?: string,
  categoryId?: string,
) {
  const [y, m, d] = date.split("-").map(Number);
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

  const conditions = [
    eq(foodHallSession.festivalId, festivalId),
    eq(foodHallSession.slotId, slotId),
    gte(foodHallEntry.scannedAt, dayStart.toISOString()),
    lte(foodHallEntry.scannedAt, dayEnd.toISOString()),
  ];
  if (groupId) conditions.push(eq(participant.groupId, groupId));
  if (categoryId) conditions.push(eq(participant.categoryId, categoryId));

  return await db
    .select({
      id: foodHallEntry.id,
      chestNumber: foodHallEntry.chestNumber,
      scannedAt: foodHallEntry.scannedAt,
      scannedByName: foodHallEntry.scannedByName,
      participantName: participant.name,
      groupName: group.name,
      categoryName: category.name,
    })
    .from(foodHallEntry)
    .innerJoin(foodHallSession, eq(foodHallEntry.sessionId, foodHallSession.id))
    .innerJoin(participant, eq(foodHallEntry.participantId, participant.id))
    .leftJoin(group, eq(participant.groupId, group.id))
    .leftJoin(category, eq(participant.categoryId, category.id))
    .where(and(...conditions))
    .orderBy(desc(foodHallEntry.scannedAt));
}

export async function insertFoodEntry(data: typeof foodHallEntry.$inferInsert) {
  const [entry] = await db.insert(foodHallEntry).values(data).returning();
  return entry;
}

export async function updateSessionStatus(
  sessionId: string,
  status: "OPEN" | "CLOSED",
) {
  const [session] = await db
    .update(foodHallSession)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(foodHallSession.id, sessionId))
    .returning();
  return session;
}

export async function deleteFoodSlots(
  festivalId: string,
  slotIdsToKeep: string[],
) {
  if (slotIdsToKeep.length > 0) {
    await db
      .delete(foodHallSlot)
      .where(
        and(
          eq(foodHallSlot.festivalId, festivalId),
          notInArray(foodHallSlot.id, slotIdsToKeep),
        ),
      );
  } else {
    await db
      .delete(foodHallSlot)
      .where(eq(foodHallSlot.festivalId, festivalId));
  }
}

export async function upsertFoodSlot(data: typeof foodHallSlot.$inferInsert) {
  const [slot] = await db
    .insert(foodHallSlot)
    .values(data)
    .onConflictDoUpdate({
      target: foodHallSlot.id,
      set: {
        slotOrder: data.slotOrder,
        name: data.name,
        windowStartMin: data.windowStartMin,
        windowEndMin: data.windowEndMin,
        updatedAt: new Date().toISOString(),
      },
    })
    .returning();
  return slot;
}

export async function insertSessions(
  sessions: (typeof foodHallSession.$inferInsert)[],
) {
  if (sessions.length === 0) return;
  await db
    .insert(foodHallSession)
    .values(sessions)
    .onConflictDoNothing({
      target: [
        foodHallSession.festivalId,
        foodHallSession.slotId,
        foodHallSession.sessionDate,
      ],
    });
}
