import { count, desc, eq, type SQL, sql } from "drizzle-orm";
import { db } from "@/core/database/client";
import { user as users } from "@/core/database/schema";

export async function findUserById(id: string) {
  return db.query.user.findFirst({
    where: eq(users.id, id),
    with: { festivals: true },
  });
}

export async function findUserByEmail(email: string) {
  return db.query.user.findFirst({
    where: eq(users.email, email),
  });
}

export async function findAllUsers(
  where?: SQL,
  orderBy: "asc" | "desc" = "desc",
) {
  return db.query.user.findMany({
    where,
    orderBy: orderBy === "desc" ? [desc(users.createdAt)] : undefined,
  });
}

export async function countUsers(where?: SQL) {
  const result = await db.select({ count: count() }).from(users).where(where);
  return result[0]?.count ?? 0;
}

export async function createUser(
  data: Omit<typeof users.$inferInsert, "id" | "updatedAt"> & {
    id?: string;
    updatedAt?: string;
  },
) {
  const { randomUUID } = await import("crypto");
  const result = await db
    .insert(users)
    .values({
      id: data.id ?? randomUUID(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      ...data,
    })
    .returning();
  return result[0];
}

export async function updateUser(
  id: string,
  data: Partial<typeof users.$inferInsert>,
) {
  const result = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  return result[0];
}

export async function deleteUser(id: string) {
  const result = await db.delete(users).where(eq(users.id, id)).returning();
  return result[0];
}
