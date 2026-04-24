import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { programme as programmes } from "@/core/database/schema";

export async function createProgramme(
  data: Omit<typeof programmes.$inferInsert, "id" | "updatedAt"> & {
    id?: string;
    updatedAt?: string;
  },
) {
  const { randomUUID } = await import("crypto");
  const result = await db
    .insert(programmes)
    .values({
      id: data.id ?? randomUUID(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      ...data,
    })
    .returning();
  return result[0];
}

export async function updateProgramme(
  id: string,
  data: Partial<typeof programmes.$inferInsert>,
) {
  const result = await db
    .update(programmes)
    .set(data)
    .where(eq(programmes.id, id))
    .returning();
  return result[0];
}

export async function deleteProgramme(id: string) {
  const result = await db
    .delete(programmes)
    .where(eq(programmes.id, id))
    .returning();
  return result[0];
}

export async function findProgrammeById(id: string) {
  const programme = await db.query.programme.findFirst({
    where: eq(programmes.id, id),
    with: {
      category: true,
      assignments: { columns: { id: true } },
    },
  });

  if (!programme) return null;
  const { assignments: pa, ...rest } = programme;
  return { ...rest, _count: { assignments: pa.length } };
}

export async function findProgrammesByFestival(
  festivalId: string,
  categoryId?: string,
) {
  const results = await db.query.programme.findMany({
    where: categoryId
      ? and(
          eq(programmes.festivalId, festivalId),
          eq(programmes.categoryId, categoryId),
        )
      : eq(programmes.festivalId, festivalId),
    orderBy: [desc(programmes.createdAt)],
    with: {
      category: true,
      assignments: { columns: { id: true } },
    },
  });

  return results.map((p) => {
    const { assignments: pa, ...rest } = p;
    return { ...rest, _count: { assignments: pa.length } };
  });
}

export async function countProgrammes(festivalId: string) {
  const result = await db
    .select({ c: count() })
    .from(programmes)
    .where(eq(programmes.festivalId, festivalId));
  return result[0].c;
}

export async function findProgrammeWithAssignments(id: string) {
  return db.query.programme.findFirst({
    where: eq(programmes.id, id),
    with: {
      category: true,
      assignments: {
        with: {
          student: {
            columns: { id: true, name: true, groupId: true },
            with: { group: true },
          },
          group: true,
        },
      },
    },
  });
}
