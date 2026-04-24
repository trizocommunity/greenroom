import { db } from "@/lib/db";
import { festivalMember } from "../db/schema";
import { eq, and, desc, SQL } from "drizzle-orm";

export async function findMemberByFestivalAndUser(
  festivalId: string,
  userId: string
) {
  return db.query.festivalMember.findFirst({
    where: and(
      eq(festivalMember.festivalId, festivalId),
      eq(festivalMember.userId, userId)
    ),
    with: { user: true },
  });
}

export async function findMembersByFestival(
  festivalId: string,
  where?: SQL
) {
  return db.query.festivalMember.findMany({
    where: where ? and(eq(festivalMember.festivalId, festivalId), where) : eq(festivalMember.festivalId, festivalId),
    with: { user: true },
    orderBy: [desc(festivalMember.createdAt)],
  });
}

export async function findMemberById(id: string) {
  return db.query.festivalMember.findFirst({
    where: eq(festivalMember.id, id),
  });
}

export async function createMember(data: Omit<typeof festivalMember.$inferInsert, "id" | "updatedAt"> & { id?: string; updatedAt?: string }) {
  const { randomUUID } = await import("crypto");
  const result = await db.insert(festivalMember).values({
    id: data.id ?? randomUUID(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    ...data,
  }).returning();
  return db.query.festivalMember.findFirst({
    where: eq(festivalMember.id, result[0].id),
    with: { user: true }
  });
}

export async function deleteMember(id: string) {
  const result = await db.delete(festivalMember).where(eq(festivalMember.id, id)).returning();
  return result[0];
}
