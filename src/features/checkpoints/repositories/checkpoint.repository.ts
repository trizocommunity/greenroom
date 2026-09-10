import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  category,
  checkpoint,
  checkpointScan,
  checkpointSession,
  group,
  participant,
} from "@/core/database/schema";

// ─── Checkpoints ────────────────────────────────────────────────────────────

export async function getCheckpoints(festivalId: string) {
  return await db.query.checkpoint.findMany({
    where: eq(checkpoint.festivalId, festivalId),
    orderBy: [asc(checkpoint.sortOrder), asc(checkpoint.name)],
  });
}

export async function getCheckpointById(id: string) {
  return await db.query.checkpoint.findFirst({
    where: eq(checkpoint.id, id),
  });
}

/** Seed the built-in Attendance + Food checkpoints; no-op if they exist. */
export async function insertCheckpoints(
  rows: (typeof checkpoint.$inferInsert)[],
) {
  if (rows.length === 0) return;
  await db
    .insert(checkpoint)
    .values(rows)
    .onConflictDoNothing({
      target: [checkpoint.festivalId, checkpoint.name],
    });
}

export async function createCheckpoint(data: typeof checkpoint.$inferInsert) {
  const [row] = await db.insert(checkpoint).values(data).returning();
  return row;
}

export async function updateCheckpoint(
  id: string,
  data: { name: string; requiresWindow: boolean },
) {
  const [row] = await db
    .update(checkpoint)
    .set({
      name: data.name,
      requiresWindow: data.requiresWindow,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(checkpoint.id, id))
    .returning();
  return row;
}

/** Deleting the checkpoint cascades to its sessions and their scans (FK). */
export async function deleteCheckpoint(id: string) {
  await db.delete(checkpoint).where(eq(checkpoint.id, id));
}

/** Total sessions (all dates) per checkpoint, for the landing-card delete gate. */
export async function getSessionCountsByCheckpoint(festivalId: string) {
  const rows = await db
    .select({
      checkpointId: checkpointSession.checkpointId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(checkpointSession)
    .where(eq(checkpointSession.festivalId, festivalId))
    .groupBy(checkpointSession.checkpointId);
  return new Map(rows.map((r) => [r.checkpointId, r.count]));
}

// ─── Filters (shared) ─────────────────────────────────────────────────────────

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

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessionsWithStats(
  festivalId: string,
  opts: { checkpointId?: string; fromDate?: string; toDate?: string } = {},
) {
  const conditions = [eq(checkpointSession.festivalId, festivalId)];
  if (opts.checkpointId)
    conditions.push(eq(checkpointSession.checkpointId, opts.checkpointId));
  if (opts.fromDate)
    conditions.push(gte(checkpointSession.sessionDate, opts.fromDate));
  if (opts.toDate)
    conditions.push(lte(checkpointSession.sessionDate, opts.toDate));

  return await db
    .select({
      id: checkpointSession.id,
      festivalId: checkpointSession.festivalId,
      checkpointId: checkpointSession.checkpointId,
      name: checkpointSession.name,
      sessionDate: checkpointSession.sessionDate,
      windowStartMin: checkpointSession.windowStartMin,
      windowEndMin: checkpointSession.windowEndMin,
      status: checkpointSession.status,
      startedAt: checkpointSession.startedAt,
      closedAt: checkpointSession.closedAt,
      checkpointName: checkpoint.name,
      requiresWindow: checkpoint.requiresWindow,
      scannedCount: sql<number>`cast(count(${checkpointScan.id}) as int)`,
    })
    .from(checkpointSession)
    .innerJoin(checkpoint, eq(checkpointSession.checkpointId, checkpoint.id))
    .leftJoin(
      checkpointScan,
      eq(checkpointSession.id, checkpointScan.sessionId),
    )
    .where(and(...conditions))
    .groupBy(checkpointSession.id, checkpoint.id)
    .orderBy(
      desc(checkpointSession.sessionDate),
      desc(checkpointSession.startedAt),
    );
}

export async function getCheckpointSessionById(sessionId: string) {
  return await db.query.checkpointSession.findFirst({
    where: eq(checkpointSession.id, sessionId),
  });
}

export async function getDistinctSessionDates(
  festivalId: string,
  checkpointId?: string,
) {
  const conditions = [eq(checkpointSession.festivalId, festivalId)];
  if (checkpointId)
    conditions.push(eq(checkpointSession.checkpointId, checkpointId));

  const rows = await db
    .selectDistinct({ sessionDate: checkpointSession.sessionDate })
    .from(checkpointSession)
    .where(and(...conditions))
    .orderBy(desc(checkpointSession.sessionDate));

  return rows.map((r) => r.sessionDate);
}

export async function insertCheckpointSession(
  data: typeof checkpointSession.$inferInsert,
) {
  const [row] = await db.insert(checkpointSession).values(data).returning();
  return row;
}

export async function updateSessionStatus(
  sessionId: string,
  status: "OPEN" | "CLOSED",
) {
  const [row] = await db
    .update(checkpointSession)
    .set({
      status,
      closedAt: status === "CLOSED" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(checkpointSession.id, sessionId))
    .returning();
  return row;
}

/** Deleting a session cascades to its scans (FK). */
export async function deleteSession(sessionId: string) {
  await db.delete(checkpointSession).where(eq(checkpointSession.id, sessionId));
}

/**
 * Auto-close OPEN sessions with no activity for `idleMinutes` — "no response
 * from camera". Activity = the later of `started_at` and the last scan's
 * `scanned_at`, so a freshly started but never-scanned session still closes.
 * Runs unattended from the Inngest cron. Returns the closed session ids.
 */
export async function closeIdleCheckpointSessions(idleMinutes = 10) {
  const result = await db.execute<{ id: string }>(sql`
    UPDATE checkpoint_session s
    SET status = 'CLOSED', closed_at = now(), updated_at = now()
    WHERE s.status = 'OPEN'
      AND GREATEST(
            s.started_at,
            COALESCE(
              (SELECT MAX(sc.scanned_at) FROM checkpoint_scan sc WHERE sc.session_id = s.id),
              s.started_at
            )
          ) < now() - (${idleMinutes} || ' minutes')::interval
    RETURNING s.id
  `);
  return result.rows.map((r) => r.id);
}

// ─── Scans ──────────────────────────────────────────────────────────────────

export async function getSessionScans(
  sessionId: string,
  groupId?: string,
  categoryId?: string,
) {
  const conditions = [eq(checkpointScan.sessionId, sessionId)];
  if (groupId) conditions.push(eq(participant.groupId, groupId));
  if (categoryId) conditions.push(eq(participant.categoryId, categoryId));

  return await db
    .select({
      id: checkpointScan.id,
      chestNumber: checkpointScan.chestNumber,
      scannedAt: checkpointScan.scannedAt,
      scannedByName: checkpointScan.scannedByName,
      participantId: participant.id,
      participantName: participant.name,
      groupName: group.name,
      categoryName: category.name,
    })
    .from(checkpointScan)
    .innerJoin(participant, eq(checkpointScan.participantId, participant.id))
    .leftJoin(group, eq(participant.groupId, group.id))
    .leftJoin(category, eq(participant.categoryId, category.id))
    .where(and(...conditions))
    .orderBy(desc(checkpointScan.scannedAt));
}

export async function insertScan(data: typeof checkpointScan.$inferInsert) {
  const [row] = await db.insert(checkpointScan).values(data).returning();
  return row;
}

/**
 * Full expected roster (participants, optionally filtered by group/category)
 * left-joined against this session's scans, so the caller can tell present
 * from absent in one query.
 */
export async function getRosterWithScanStatus(
  festivalId: string,
  sessionId: string,
  groupId?: string,
  categoryId?: string,
) {
  const conditions = [eq(participant.festivalId, festivalId)];
  if (groupId) conditions.push(eq(participant.groupId, groupId));
  if (categoryId) conditions.push(eq(participant.categoryId, categoryId));

  return await db
    .select({
      participantId: participant.id,
      participantName: participant.name,
      chestNumber: participant.chestNumber,
      groupName: group.name,
      categoryName: category.name,
      scannedAt: checkpointScan.scannedAt,
      present: sql<boolean>`${checkpointScan.id} is not null`,
    })
    .from(participant)
    .leftJoin(group, eq(participant.groupId, group.id))
    .leftJoin(category, eq(participant.categoryId, category.id))
    .leftJoin(
      checkpointScan,
      and(
        eq(checkpointScan.participantId, participant.id),
        eq(checkpointScan.sessionId, sessionId),
      ),
    )
    .where(and(...conditions))
    .orderBy(asc(participant.name));
}
