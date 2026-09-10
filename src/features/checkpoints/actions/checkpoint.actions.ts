"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/core/auth/session";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import * as repo from "../repositories/checkpoint.repository";
import {
  createCheckpointSchema,
  deleteCheckpointSchema,
  deleteSessionSchema,
  getRosterSchema,
  getSessionScansSchema,
  getSessionStatusSchema,
  scanCheckpointSchema,
  startSessionSchema,
  toggleSessionStatusSchema,
  updateCheckpointSchema,
} from "../schemas/checkpoint.schema";
import * as service from "../services/checkpoint.service";

const BASE = `/dashboard/[slug]/event-works/checkpoints`;

function revalidateCheckpoints() {
  revalidatePath(BASE);
  revalidatePath(`${BASE}/[checkpointId]`);
}

export async function createCheckpointAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = createCheckpointSchema.parse(data);
  const checkpoint = await repo.createCheckpoint({
    id: crypto.randomUUID(),
    festivalId: parsed.festivalId,
    name: parsed.name,
    requiresWindow: parsed.requiresWindow,
    isBuiltIn: false,
    sortOrder: 100,
    createdByName: session.name || undefined,
    createdByEmail: session.email || undefined,
  });

  revalidateCheckpoints();
  return { success: true, checkpoint };
}

export async function updateCheckpointAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = updateCheckpointSchema.parse(data);
  try {
    await service.updateCheckpoint(parsed);
    revalidateCheckpoints();
    return { success: true };
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : "Failed to update the checkpoint.";
    return { success: false, error: message };
  }
}

export async function deleteCheckpointAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = deleteCheckpointSchema.parse(data);
  try {
    await service.deleteCheckpoint(parsed.festivalId, parsed.checkpointId);
    revalidateCheckpoints();
    return { success: true };
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : "Failed to delete the checkpoint.";
    return { success: false, error: message };
  }
}

export async function startSessionAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = startSessionSchema.parse(data);

  try {
    const created = await service.startCheckpointSession(parsed, {
      name: session.name,
      email: session.email,
    });
    revalidateCheckpoints();
    return {
      success: true,
      session: {
        id: created.id,
        checkpointId: created.checkpointId,
        name: created.name,
        sessionDate: created.sessionDate,
        windowStartMin: created.windowStartMin,
        windowEndMin: created.windowEndMin,
        status: created.status,
        scannedCount: 0,
      },
    };
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : "Failed to start the session.";
    return { success: false, error: message };
  }
}

export async function scanCheckpointAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = scanCheckpointSchema.parse(data);

  try {
    const result = await service.recordCheckpointScan(
      parsed.festivalId,
      parsed.sessionId,
      parsed.chestNumber,
      {
        userId: session.userId,
        name: session.name || undefined,
        email: session.email || undefined,
      },
    );
    revalidateCheckpoints();
    return {
      success: true,
      participant: result.participant,
      scannedAt: result.scannedAt,
    };
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

export async function getSessionScansAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = getSessionScansSchema.parse(data);
  const scans = await repo.getSessionScans(
    parsed.sessionId,
    parsed.groupId,
    parsed.categoryId,
  );
  return { success: true, scans };
}

export async function getRosterAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = getRosterSchema.parse(data);
  const roster = await repo.getRosterWithScanStatus(
    parsed.festivalId,
    parsed.sessionId,
    parsed.groupId,
    parsed.categoryId,
  );
  return { success: true, roster };
}

export async function toggleSessionStatusAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = toggleSessionStatusSchema.parse(data);
  await service.toggleSessionStatus(parsed.sessionId, parsed.status);
  revalidateCheckpoints();
  return { success: true };
}

export async function deleteSessionAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = deleteSessionSchema.parse(data);
  try {
    await service.deleteSession(parsed.festivalId, parsed.sessionId);
    revalidateCheckpoints();
    return { success: true };
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : "Failed to delete the session.";
    return { success: false, error: message };
  }
}

export async function getSessionStatusAction(data: unknown) {
  const session = await getSession();
  if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);

  const parsed = getSessionStatusSchema.parse(data);
  const row = await repo.getCheckpointSessionById(parsed.sessionId);
  if (!row || row.festivalId !== parsed.festivalId) {
    return { success: false as const, status: null };
  }
  return { success: true as const, status: row.status };
}
