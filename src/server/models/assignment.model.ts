import { db } from "@/lib/db";
import { programmeAssignment } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function createAssignment(
  data: Omit<typeof programmeAssignment.$inferInsert, "id" | "updatedAt"> & { id?: string; updatedAt?: string }
) {
  const { randomUUID } = await import("crypto");
  const result = await db.insert(programmeAssignment).values({
    id: data.id ?? randomUUID(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    ...data,
  }).returning();
  return result[0];
}

export async function deleteAssignment(id: string) {
  const result = await db.delete(programmeAssignment).where(eq(programmeAssignment.id, id)).returning();
  return result[0];
}

export async function updateAssignment(
  id: string,
  data: Partial<typeof programmeAssignment.$inferInsert>
) {
  const result = await db.update(programmeAssignment).set(data).where(eq(programmeAssignment.id, id)).returning();
  return result[0];
}

export async function findAssignmentsByProgramme(programmeId: string) {
  return db.query.programmeAssignment.findMany({
    where: eq(programmeAssignment.programmeId, programmeId),
    with: {
      student: {
        with: {
          group: true,
        },
      },
      group: true,
    },
    orderBy: [desc(programmeAssignment.createdAt)],
  });
}

export async function findAssignmentsByStudent(studentId: string) {
  return db.query.programmeAssignment.findMany({
    where: eq(programmeAssignment.studentId, studentId),
    with: { programme: true },
    orderBy: [desc(programmeAssignment.createdAt)],
  });
}

export async function checkAssignmentExists(
  programmeId: string,
  studentId: string
) {
  const assignment = await db.query.programmeAssignment.findFirst({
    where: and(
      eq(programmeAssignment.programmeId, programmeId),
      eq(programmeAssignment.studentId, studentId)
    ),
  });
  return !!assignment;
}
