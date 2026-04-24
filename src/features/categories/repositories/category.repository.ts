import { count, desc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { category as categories } from "@/core/database/schema";

export async function createCategory(
  data: Omit<typeof categories.$inferInsert, "id" | "updatedAt"> & {
    id?: string;
    updatedAt?: string;
  },
) {
  const { randomUUID } = await import("crypto");
  const result = await db
    .insert(categories)
    .values({
      id: data.id ?? randomUUID(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      ...data,
    })
    .returning();
  return result[0];
}

export async function updateCategory(
  id: string,
  data: Partial<typeof categories.$inferInsert>,
) {
  const result = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning();
  return result[0];
}

export async function deleteCategory(id: string) {
  const result = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning();
  return result[0];
}

export async function findCategoryById(id: string) {
  const category = await db.query.category.findFirst({
    where: eq(categories.id, id),
    with: {
      programmes: { columns: { id: true } },
      students: { columns: { id: true } },
    },
  });

  if (!category) return null;
  const { programmes, students, ...rest } = category;
  return {
    ...rest,
    _count: { programmes: programmes.length, students: students.length },
  };
}

export async function findCategoriesByFestival(festivalId: string) {
  const results = await db.query.category.findMany({
    where: eq(categories.festivalId, festivalId),
    orderBy: [desc(categories.createdAt)],
    with: {
      programmes: { columns: { id: true } },
      students: { columns: { id: true } },
    },
  });

  return results.map((cat) => {
    const { programmes, students, ...rest } = cat;
    return {
      ...rest,
      _count: { programmes: programmes.length, students: students.length },
    };
  });
}

export async function countCategories(festivalId: string) {
  const result = await db
    .select({ c: count() })
    .from(categories)
    .where(eq(categories.festivalId, festivalId));
  return result[0].c;
}
