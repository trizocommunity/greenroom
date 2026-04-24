import { db } from "@/lib/db";
import { student as students } from "../db/schema";
import { eq, and, desc, count } from "drizzle-orm";

export async function createStudent(data: Omit<typeof students.$inferInsert, "id" | "updatedAt"> & { id?: string; updatedAt?: string }) {
  const { randomUUID } = await import("crypto");
  const result = await db.insert(students).values({
    id: data.id ?? randomUUID(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    ...data,
  }).returning();
  return result[0];
}

export async function deleteStudent(id: string) {
  const result = await db.delete(students).where(eq(students.id, id)).returning();
  return result[0];
}

export async function updateStudent(id: string, data: Partial<typeof students.$inferInsert>) {
  const result = await db.update(students).set(data).where(eq(students.id, id)).returning();
  return result[0];
}

export async function findStudentById(id: string) {
  return db.query.student.findFirst({
    where: eq(students.id, id),
    with: { category: true, group: true },
  });
}

export async function findStudentByFestivalAndProfileSlug(
  festivalId: string,
  profileSlug: string
) {
  return db.query.student.findFirst({
    where: and(eq(students.festivalId, festivalId), eq(students.profileSlug, profileSlug)),
    with: {
      category: true,
      group: true,
      assignments: {
        with: {
          programme: { with: { category: true } },
        },
      },
    },
  });
}

export async function findStudentsByFestival(festivalId: string, groupId?: string) {
  return db.query.student.findMany({
    where: groupId ? and(eq(students.festivalId, festivalId), eq(students.groupId, groupId)) : eq(students.festivalId, festivalId),
    orderBy: [desc(students.createdAt)],
    with: { category: true, group: true },
  });
}

export async function countStudents(festivalId: string) {
  const result = await db.select({ c: count() }).from(students).where(eq(students.festivalId, festivalId));
  return result[0].c;
}
