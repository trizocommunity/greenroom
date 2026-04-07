import { realtimeConfig } from "@/lib/realtime-config";
import type { RealtimeEnvelope } from "@/server/realtime/events";
import { realtimeObservability } from "@/server/realtime/observability";
import {
  claimPendingOutboxBatch,
  markOutboxDispatched,
  markOutboxFailed,
  recoverStaleProcessingOutbox,
} from "@/server/realtime/outbox.service";
import { publishTransportMessage } from "@/server/realtime/transport";

function parseRoomKeys(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((v): v is string => typeof v === "string");
}

function parseEnvelope(row: {
  eventId: string;
  eventName: string;
  eventVersion: number;
  festivalId: string;
  entityType: string;
  entityId: string;
  correlationId: string | null;
  idempotencyKey: string;
  sequence: number | null;
  payload: unknown;
  createdAt: Date;
}): RealtimeEnvelope {
  return {
    eventId: row.eventId,
    eventName: row.eventName as RealtimeEnvelope["eventName"],
    eventVersion: row.eventVersion,
    occurredAt: row.createdAt.toISOString(),
    festivalId: row.festivalId,
    entityType: row.entityType,
    entityId: row.entityId,
    correlationId: row.correlationId ?? undefined,
    idempotencyKey: row.idempotencyKey,
    sequence: row.sequence ?? undefined,
    payload: (row.payload ?? {}) as Record<string, unknown>,
  };
}

export async function dispatchRealtimeOutboxBatch(): Promise<number> {
  if (!realtimeConfig.enabled) return 0;
  await recoverStaleProcessingOutbox();
  const rows = await claimPendingOutboxBatch(
    realtimeConfig.outboxDispatchBatchSize,
  );
  if (rows.length === 0) return 0;

  let dispatched = 0;
  for (const row of rows) {
    try {
      await publishTransportMessage({
        envelope: parseEnvelope(row),
        roomKeys: parseRoomKeys(row.roomKeys),
      });
      await markOutboxDispatched(row.id);
      dispatched += 1;
    } catch (error) {
      await markOutboxFailed(
        row.id,
        row.retryCount,
        error instanceof Error ? error.message : "unknown realtime error",
      );
      realtimeObservability.dispatchFailure("outbox-dispatch", {
        id: row.id,
        eventName: row.eventName,
      });
    }
  }
  realtimeObservability.metric("outbox_batch_dispatched", {
    size: rows.length,
    dispatched,
  });
  return dispatched;
}

export async function runRealtimeDispatcherLoop(signal?: AbortSignal) {
  if (!realtimeConfig.outboxDispatcherEnabled) return;

  while (!signal?.aborted) {
    const count = await dispatchRealtimeOutboxBatch();
    const sleepMs = count > 0 ? 250 : 1000;
    await new Promise((resolve) => setTimeout(resolve, sleepMs));
  }
}
