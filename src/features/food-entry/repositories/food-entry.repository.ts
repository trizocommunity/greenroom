import { eq, and, asc, sql, desc, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/core/database/client";
import { 
  foodHallSlot, 
  foodHallSession, 
  foodHallEntry,
  festival,
  participant
} from "@/core/database/schema";

export async function getFoodSlots(festivalId: string) {
  return await db.query.foodHallSlot.findMany({
    where: eq(foodHallSlot.festivalId, festivalId),
    orderBy: [asc(foodHallSlot.slotOrder)],
  });
}

export async function getFoodSessionsWithStats(festivalId: string, fromDate?: string, toDate?: string) {
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
    .groupBy(
      foodHallSession.id,
      foodHallSlot.id
    )
    .orderBy(asc(foodHallSession.sessionDate), asc(foodHallSlot.slotOrder));

  return sessions;
}

export async function getSessionById(sessionId: string) {
  return await db.query.foodHallSession.findFirst({
    where: eq(foodHallSession.id, sessionId),
    with: {
      slot: true,
    }
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
      // More fields like category_name, team_name can be joined if required
    })
    .from(foodHallEntry)
    .innerJoin(participant, eq(foodHallEntry.participantId, participant.id))
    .where(eq(foodHallEntry.sessionId, sessionId))
    .orderBy(desc(foodHallEntry.scannedAt));
}

export async function insertFoodEntry(data: typeof foodHallEntry.$inferInsert) {
  const [entry] = await db.insert(foodHallEntry).values(data).returning();
  return entry;
}

export async function updateSessionStatus(sessionId: string, status: "OPEN" | "CLOSED") {
  const [session] = await db
    .update(foodHallSession)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(foodHallSession.id, sessionId))
    .returning();
  return session;
}

export async function deleteFoodSlots(festivalId: string, slotIdsToKeep: string[]) {
  if (slotIdsToKeep.length > 0) {
    await db
      .delete(foodHallSlot)
      .where(and(eq(foodHallSlot.festivalId, festivalId), sql`${foodHallSlot.id} NOT IN ${inArray(foodHallSlot.id, slotIdsToKeep)}`)); // Or use notInArray
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

export async function ensureSessionsForDateRange(festivalId: string, slotIds: string[], startDate: Date, endDate: Date) {
  // We'll generate sessions in the service layer and insert them using insertSession
}

export async function insertSessions(sessions: (typeof foodHallSession.$inferInsert)[]) {
  if (sessions.length === 0) return;
  await db
    .insert(foodHallSession)
    .values(sessions)
    .onConflictDoNothing({ target: [foodHallSession.festivalId, foodHallSession.slotId, foodHallSession.sessionDate] });
}
