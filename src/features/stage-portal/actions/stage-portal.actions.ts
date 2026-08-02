"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  clearStagePortalSessionCookie,
  createRawSessionToken,
  getStagePortalSessionExpiryDate,
  getTokenHash,
  setStagePortalSessionCookie,
} from "@/core/auth/stage-portal-session";
import { db } from "@/core/database/client";
import {
  stagePortalCredential as credentialTable,
  festival as festivalTable,
  stagePortalSession as sessionTable,
} from "@/core/database/schema";
import { isExpired } from "@/core/datetime";
import { fromNow, MS, serverNowIso } from "@/core/datetime/server";
import { AppError } from "@/core/errors/errors";
import {
  normalizeAccessCode,
  verifyPin,
} from "@/features/stage-portal/services/pin";

const MAX_PIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 10 * MS.minute;

export async function getStagePortalLoginAction(input: {
  festivalSlug: string;
  accessCode: string;
  pin: string;
}) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, input.festivalSlug),
    columns: { id: true },
  });
  if (!festival) throw new AppError("Festival not found.");

  const accessCode = normalizeAccessCode(input.accessCode);
  const credential = await db.query.stagePortalCredential.findFirst({
    where: and(
      eq(credentialTable.festivalId, festival.id),
      eq(credentialTable.accessCode, accessCode),
    ),
  });
  if (!credential) throw new AppError("Invalid access code or PIN.");

  if (credential.lockedUntil && !isExpired(credential.lockedUntil)) {
    throw new AppError("Too many attempts. Try again in a few minutes.");
  }

  const pin = input.pin.trim();
  const isValid = await verifyPin(pin, credential.pinHash);

  if (!isValid) {
    const nextAttempts = (credential.attempts ?? 0) + 1;
    const shouldLock = nextAttempts >= MAX_PIN_ATTEMPTS;
    await db
      .update(credentialTable)
      .set({
        attempts: shouldLock ? 0 : nextAttempts,
        lockedUntil: shouldLock ? fromNow(LOCK_DURATION_MS) : null,
      } as any)
      .where(eq(credentialTable.id, credential.id));

    if (shouldLock) {
      throw new AppError(
        "Too many incorrect attempts. Try again in 10 minutes.",
      );
    }
    throw new AppError(
      `Incorrect PIN. ${MAX_PIN_ATTEMPTS - nextAttempts} attempts left.`,
    );
  }

  await db
    .update(credentialTable)
    .set({ attempts: 0, lockedUntil: null } as any)
    .where(eq(credentialTable.id, credential.id));

  const rawToken = createRawSessionToken();
  const tokenHash = getTokenHash(rawToken);
  const expiresAt = getStagePortalSessionExpiryDate();
  const now = serverNowIso();

  await db.insert(sessionTable).values({
    id: randomUUID(),
    stageId: credential.stageId,
    festivalId: festival.id,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  } as any);

  await setStagePortalSessionCookie(rawToken, expiresAt);

  return { success: true as const };
}

export async function logoutStagePortalAction() {
  await clearStagePortalSessionCookie();
  return { success: true as const };
}
