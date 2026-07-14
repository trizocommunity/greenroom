import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/core/database/client";
import { magicLinkToken } from "@/core/database/schema";

const TOKEN_BYTES = 32;

export function generateMagicToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createMagicLinkToken(
  email: string,
  expiresInMs: number,
): Promise<string> {
  const token = generateMagicToken();
  const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

  await db.insert(magicLinkToken).values({
    id: crypto.randomUUID(),
    email: email.toLowerCase().trim(),
    token,
    expiresAt,
  });

  return token;
}

export async function consumeMagicLinkToken(token: string) {
  const now = new Date().toISOString();

  const record = await db.query.magicLinkToken.findFirst({
    where: and(
      eq(magicLinkToken.token, token),
      isNull(magicLinkToken.usedAt),
      gt(magicLinkToken.expiresAt, now),
    ),
  });

  if (!record) return null;

  await db
    .update(magicLinkToken)
    .set({ usedAt: now })
    .where(eq(magicLinkToken.id, record.id));

  return record;
}

export async function findPendingMagicLinkToken(email: string) {
  const now = new Date().toISOString();

  return db.query.magicLinkToken.findFirst({
    where: and(
      eq(magicLinkToken.email, email.toLowerCase().trim()),
      isNull(magicLinkToken.usedAt),
      gt(magicLinkToken.expiresAt, now),
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}
