import { db } from "@/lib/db";
import { result as results, programme as programmes } from "../db/schema";
import { eq, and, asc } from "drizzle-orm";

export interface ResultInput {
  id?: string;
  festivalId: string;
  programmeId: string;
  assignmentId: string;
  grade?: string | null;
  position?: number | null;
  points?: number;
  remarks?: string | null;
  isPublished?: boolean;
}

async function deleteResult(id: string) {
  const result = await db.delete(results).where(eq(results.id, id)).returning();
  return result[0];
}

async function findByFestival(festivalId: string, publishedOnly = false) {
  return db.query.result.findMany({
    where: publishedOnly ? and(eq(results.festivalId, festivalId), eq(results.isPublished, true)) : eq(results.festivalId, festivalId),
    with: {
      programmeAssignment: {
        with: {
          student: true,
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
          student: true,
          group: true,
        },
      },
    },
    orderBy: [asc(results.position)],
  });
}

async function togglePublish(id: string, isPublished: boolean) {
  const result = await db.update(results).set({ isPublished }).where(eq(results.id, id)).returning();
  return result[0];
}

async function bulkPublishByProgramme(programmeId: string, isPublished: boolean) {
  const result = await db.update(results).set({ isPublished }).where(eq(results.programmeId, programmeId)).returning();
  return result;
}

async function bulkPublishByFestival(festivalId: string, isPublished: boolean) {
  const result = await db.update(results).set({ isPublished }).where(eq(results.festivalId, festivalId)).returning();
  return result;
}

async function upsert(assignmentId: string, data: ResultInput) {
  const result = await db.insert(results).values({
    ...data,
    points: data.points ?? 0,
    isPublished: data.isPublished ?? false,
  }).onConflictDoUpdate({
    target: results.assignmentId,
    set: {
      grade: data.grade,
      position: data.position,
      points: data.points ?? 0,
      remarks: data.remarks,
      isPublished: data.isPublished ?? false,
    }
  }).returning();
  
  return db.query.result.findFirst({
    where: eq(results.id, result[0].id),
    with: {
      programmeAssignment: {
        with: { student: true, group: true },
      },
      programme: true,
    }
  });
}

export const ResultModel = {
  delete: deleteResult,
  findByFestival,
  findByProgramme,
  togglePublish,
  bulkPublishByProgramme,
  bulkPublishByFestival,
  upsert,
};
