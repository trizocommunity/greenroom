import type { Prisma, RealtimeOutboxStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { realtimeConfig } from "@/lib/realtime-config";
import type { RealtimeEnvelope } from "@/server/realtime/events";

function toJsonValue(data: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
}

type EnqueueInput = {
  envelope: RealtimeEnvelope;
  roomKeys: string[];
  actorUserId?: string | null;
  tx?: Prisma.TransactionClient;
};

export async function enqueueRealtimeOutboxEvent({
  envelope,
  roomKeys,
  actorUserId,
  tx,
}: EnqueueInput) {
  const db = tx ?? prisma;
  return db.realtimeOutbox.create({
    data: {
      eventId: envelope.eventId,
      eventName: envelope.eventName,
      eventVersion: envelope.eventVersion,
      festivalId: envelope.festivalId,
      entityType: envelope.entityType,
      entityId: envelope.entityId,
      payload: toJsonValue(envelope.payload),
      roomKeys: toJsonValue(roomKeys),
      correlationId: envelope.correlationId,
      idempotencyKey: envelope.idempotencyKey,
      sequence: envelope.sequence,
      actorUserId: actorUserId ?? envelope.actor?.id ?? null,
      status: "PENDING",
      nextAttemptAt: new Date(),
    },
  });
}

export async function claimPendingOutboxBatch(limit: number) {
  const now = new Date();
  const candidates = await prisma.realtimeOutbox.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: now },
    },
    orderBy: [{ createdAt: "asc" }],
    take: Math.max(limit * 3, limit),
    select: { id: true },
  });
  if (candidates.length === 0) return [];

  const claimedIds: string[] = [];
  for (const row of candidates) {
    if (claimedIds.length >= limit) break;
    const result = await prisma.realtimeOutbox.updateMany({
      where: {
        id: row.id,
        status: { in: ["PENDING", "FAILED"] },
        nextAttemptAt: { lte: now },
      },
      data: { status: "PROCESSING" },
    });
    if (result.count > 0) claimedIds.push(row.id);
  }
  if (claimedIds.length === 0) return [];
  return prisma.realtimeOutbox.findMany({
    where: { id: { in: claimedIds } },
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function markOutboxDispatched(id: string) {
  return prisma.realtimeOutbox.update({
    where: { id },
    data: {
      status: "DISPATCHED",
      dispatchedAt: new Date(),
      errorMessage: null,
    },
  });
}

export async function markOutboxFailed(
  id: string,
  retryCount: number,
  errorMessage: string,
) {
  const nextRetry = Math.max(0, retryCount) + 1;
  if (nextRetry >= realtimeConfig.outboxDispatchMaxRetries) {
    return prisma.realtimeOutbox.update({
      where: { id },
      data: {
        status: "FAILED",
        retryCount: { increment: 1 },
        errorMessage: `[terminal] ${errorMessage}`,
        nextAttemptAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10),
      },
    });
  }
  const cappedRetry = Math.max(0, retryCount);
  const delayMs = Math.min(1000 * 2 ** cappedRetry, 30000);
  return prisma.realtimeOutbox.update({
    where: { id },
    data: {
      status: "FAILED",
      retryCount: { increment: 1 },
      errorMessage,
      nextAttemptAt: new Date(Date.now() + delayMs),
    },
  });
}

export async function recoverStaleProcessingOutbox() {
  if (!realtimeConfig.outboxStuckRecoveryEnabled) return 0;
  const leaseCutoff = new Date(
    Date.now() - realtimeConfig.outboxProcessingLeaseMs,
  );
  const result = await prisma.realtimeOutbox.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: leaseCutoff },
    },
    data: {
      status: "FAILED",
      errorMessage: "Recovered stale PROCESSING record",
      nextAttemptAt: new Date(),
    },
  });
  return result.count;
}

export async function getRealtimeOutboxBacklogCount(
  status: RealtimeOutboxStatus = "PENDING",
) {
  return prisma.realtimeOutbox.count({ where: { status } });
}

export function shouldUseOutboxDispatcher() {
  return realtimeConfig.enabled && realtimeConfig.outboxDispatcherEnabled;
}
