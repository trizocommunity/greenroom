import { db } from "@/lib/db";
import { passwordResetToken as passwordResetTokens } from "../db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";

export async function findPasswordResetTokenByHash(token: string) {
  return db.query.passwordResetToken.findFirst({
    where: eq(passwordResetTokens.token, token),
  });
}

export async function findValidPasswordResetToken(token: string) {
  return db.query.passwordResetToken.findFirst({
    where: and(
      eq(passwordResetTokens.token, token),
      gt(passwordResetTokens.expires, new Date().toISOString()),
      isNull(passwordResetTokens.usedAt)
    ),
  });
}

export async function createPasswordResetToken(
  data: Omit<typeof passwordResetTokens.$inferInsert, "id" | "updatedAt"> & { id?: string; updatedAt?: string }
) {
  const { randomUUID } = await import("crypto");
  const result = await db.insert(passwordResetTokens).values({
    id: data.id ?? randomUUID(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    ...data,
  }).returning();
  return result[0];
}

export async function updatePasswordResetToken(
  id: string,
  data: Partial<typeof passwordResetTokens.$inferInsert>
) {
  const result = await db
    .update(passwordResetTokens)
    .set(data)
    .where(eq(passwordResetTokens.id, id))
    .returning();
  return result[0];
}

export async function deletePasswordResetToken(id: string) {
  const result = await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.id, id))
    .returning();
  return result[0];
}
