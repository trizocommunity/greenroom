"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import {
  stagePortalCredential as credentialTable,
  stagePortalSession as sessionTable,
} from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import {
  generateAccessCode,
  generatePin,
  hashPin,
} from "@/features/stage-portal/services/pin";

type DbOrTx = typeof db;

/**
 * Inserts a stage_portal_credential row for a newly created stage. Called
 * from the stage-creation API route so every stage gets a portal login
 * the moment it exists — nobody has to remember to set one up.
 */
export async function provisionStagePortalCredential(
  input: { festivalId: string; stageId: string },
  tx: DbOrTx = db,
): Promise<{ accessCode: string; pin: string }> {
  const accessCode = generateAccessCode();
  const pin = generatePin();
  const pinHash = await hashPin(pin);
  const now = serverNowIso();

  await tx.insert(credentialTable).values({
    id: randomUUID(),
    festivalId: input.festivalId,
    stageId: input.stageId,
    accessCode,
    pinHash,
    attempts: 0,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
  } as any);

  return { accessCode, pin };
}

export async function getStagePortalCredentialAction(
  festivalId: string,
  stageId: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);

  const credential = await db.query.stagePortalCredential.findFirst({
    where: and(
      eq(credentialTable.festivalId, festivalId),
      eq(credentialTable.stageId, stageId),
    ),
    columns: { accessCode: true },
  });
  if (!credential) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  return { accessCode: credential.accessCode };
}

export async function resetStagePortalCredentialAction(
  festivalId: string,
  stageId: string,
) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId, { requireWritable: true });

  const credential = await db.query.stagePortalCredential.findFirst({
    where: and(
      eq(credentialTable.festivalId, festivalId),
      eq(credentialTable.stageId, stageId),
    ),
    columns: { id: true },
  });
  if (!credential) throw new AppError(ERROR_MESSAGES.NOT_FOUND);

  const accessCode = generateAccessCode();
  const pin = generatePin();
  const pinHash = await hashPin(pin);
  const now = serverNowIso();

  await db.transaction(async (tx) => {
    await tx
      .update(credentialTable)
      .set({
        accessCode,
        pinHash,
        attempts: 0,
        lockedUntil: null,
        updatedAt: now,
      } as any)
      .where(eq(credentialTable.id, credential.id));

    await tx
      .update(sessionTable)
      .set({ revokedAt: now, updatedAt: now } as any)
      .where(
        and(eq(sessionTable.stageId, stageId), isNull(sessionTable.revokedAt)),
      );
  });

  return { accessCode, pin };
}
