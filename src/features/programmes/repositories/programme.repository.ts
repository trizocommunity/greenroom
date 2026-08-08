import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/core/database/client";
import { programme as programmes } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

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
      updatedAt: data.updatedAt ?? serverNowIso(),
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

export async function findProgrammesByFestivalPaginated(
  festivalId: string,
  options: {
    page: number;
    pageSize: number;
    categoryId?: string;
    search?: string;
    type?: string;
    stageType?: string;
    status?: string;
  },
) {
  const { page, pageSize, categoryId, search, type, stageType, status } =
    options;
  const offset = (page - 1) * pageSize;

  const where = and(
    eq(programmes.festivalId, festivalId),
    categoryId && categoryId !== "ALL"
      ? eq(programmes.categoryId, categoryId)
      : undefined,
    type && type !== "ALL"
      ? eq(programmes.type, type as "INDIVIDUAL" | "GROUP")
      : undefined,
    stageType && stageType !== "ALL"
      ? eq(programmes.stageType, stageType as "STAGE" | "NON_STAGE")
      : undefined,
    status && status !== "ALL"
      ? eq(programmes.status, status as any)
      : undefined,
    search ? ilike(programmes.name, `%${search}%`) : undefined,
  );

  const [rows, totalRows] = await Promise.all([
    db.query.programme.findMany({
      where,
      orderBy: [desc(programmes.createdAt)],
      limit: pageSize,
      offset,
      with: {
        category: true,
        assignments: { columns: { id: true } },
      },
    }),
    db.select({ value: count() }).from(programmes).where(where),
  ]);

  const mapped = rows.map((p) => {
    const { assignments: pa, ...rest } = p;
    return { ...rest, _count: { assignments: pa.length } };
  });

  return {
    data: mapped,
    total: totalRows[0]?.value ?? 0,
    page,
    pageSize,
    hasMore: page * pageSize < (totalRows[0]?.value ?? 0),
  };
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
          participant: {
            columns: {
              id: true,
              name: true,
              groupId: true,
              chestNumber: true,
            },
            with: { group: true },
          },
          group: true,
        },
      },
    },
  });
}
