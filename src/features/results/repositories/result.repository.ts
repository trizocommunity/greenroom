import { and, asc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import {
  programme as programmes,
  result as results,
} from "@/core/database/schema";

export interface ResultInput {
  id?: string;
  festivalId: string;
  programmeId: string;
  assignmentId: string;
  grade?: string | null;
  position?: number | null;
  points?: number;
  awardPoints?: number;
  scoringPolicyVersion?: number | null;
  remarks?: string | null;
  isPublished?: boolean;
}

async function deleteResult(id: string) {
  const result = await db.delete(results).where(eq(results.id, id)).returning();
  return result[0];
}

async function findByFestival(festivalId: string, publishedOnly = false) {
  return db.query.result.findMany({
    where: publishedOnly
      ? and(eq(results.festivalId, festivalId), eq(results.isPublished, true))
      : eq(results.festivalId, festivalId),
    with: {
      programmeAssignment: {
        with: {
          participant: true,
          group: true,
        },
      },
      programme: {
        with: {
          category: true,
        },
      },
    },
    // Drizzle currently doesn't support complex nested sorting natively in relational queries easily, but let's approximate or just sort locally if needed.
    // We will let it be simple for now or use standard SQL.
    orderBy: [asc(results.position)],
  });
}

async function findByProgramme(programmeId: string) {
  return db.query.result.findMany({
    where: eq(results.programmeId, programmeId),
    with: {
      programmeAssignment: {
        with: {
          participant: true,
          group: true,
        },
      },
    },
    orderBy: [asc(results.position)],
  });
}

async function togglePublish(id: string, isPublished: boolean) {
  const result = await db
    .update(results)
    .set({ isPublished })
    .where(eq(results.id, id))
    .returning();
  return result[0];
}

async function bulkPublishByProgramme(
  programmeId: string,
  isPublished: boolean,
) {
  const now = new Date().toISOString();
  const result = await db
    .update(results)
    .set(
      isPublished
        ? { isPublished: true, updatedAt: now }
        : {
            isPublished: false,
            isAnnounced: false,
            announcedAt: null,
            updatedAt: now,
          },
    )
    .where(eq(results.programmeId, programmeId))
    .returning();
  return result;
}

async function bulkAnnounceByProgramme(programmeId: string) {
  const now = new Date().toISOString();
  return db
    .update(results)
    .set({ isAnnounced: true, announcedAt: now, updatedAt: now })
    .where(
      and(eq(results.programmeId, programmeId), eq(results.isPublished, true)),
    )
    .returning();
}

async function bulkPublishByFestival(festivalId: string, isPublished: boolean) {
  const result = await db
    .update(results)
    .set({ isPublished })
    .where(eq(results.festivalId, festivalId))
    .returning();
  return result;
}

async function upsert(_assignmentId: string, data: ResultInput) {
  const { randomUUID } = await import("crypto");
  const now = new Date().toISOString();

  const result = await db
    .insert(results)
    .values({
      id: data.id ?? randomUUID(),
      updatedAt: now,
      ...data,
      points: data.points ?? 0,
      awardPoints: data.awardPoints ?? 0,
      scoringPolicyVersion: data.scoringPolicyVersion ?? null,
      isPublished: data.isPublished ?? false,
    })
    .onConflictDoUpdate({
      target: results.assignmentId,
      set: {
        grade: data.grade,
        position: data.position,
        points: data.points ?? 0,
        awardPoints: data.awardPoints ?? 0,
        scoringPolicyVersion: data.scoringPolicyVersion ?? null,
        remarks: data.remarks,
        isPublished: data.isPublished ?? false,
      },
    })
    .returning();

  return db.query.result.findFirst({
    where: eq(results.id, result[0].id),
    with: {
      programmeAssignment: {
        with: { participant: true, group: true },
      },
      programme: true,
    },
  });
}

export const ResultModel = {
  delete: deleteResult,
  findByFestival,
  findByProgramme,
  togglePublish,
  bulkPublishByProgramme,
  bulkAnnounceByProgramme,
  bulkPublishByFestival,
  upsert,
};
