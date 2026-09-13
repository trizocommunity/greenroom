"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
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
import { serverNowIso } from "@/core/datetime/server";
import { AppError } from "@/core/errors/errors";
import { verifyPin } from "@/features/stage-portal/services/pin";

export async function getStagePortalLoginAction(input: {
  festivalSlug: string;
  pin: string;
}) {
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.slug, input.festivalSlug),
    columns: { id: true },
  });
  if (!festival) throw new AppError("Festival not found.");

  const credentials = await db.query.stagePortalCredential.findMany({
    where: eq(credentialTable.festivalId, festival.id),
  });

  const pin = input.pin.trim();
  let matchedCredential = null;

  // We loop through all credentials. If we find a match, we stop.
  for (const credential of credentials) {
    if (credential.lockedUntil && !isExpired(credential.lockedUntil)) {
      continue;
    }
    const isValid = await verifyPin(pin, credential.pinHash);
    if (isValid) {
      matchedCredential = credential;
      break;
    }
  }

  if (!matchedCredential) {
    throw new AppError("Invalid PIN.");
  }

  await db
    .update(credentialTable)
    .set({ attempts: 0, lockedUntil: null } as any)
    .where(eq(credentialTable.id, matchedCredential.id));

  const credential = matchedCredential;

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

  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
  } catch (e) {}
  return { success: true as const };
}

export async function logoutStagePortalAction() {
  await clearStagePortalSessionCookie();
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
  } catch (e) {}
  return { success: true as const };
}
