import { realtimeConfig } from "@/lib/realtime-config";
import {
  createEventId,
  createIdempotencyKey,
  type RealtimeEnvelope,
  type RealtimeEventName,
} from "@/server/realtime/events";
import { enqueueRealtimeOutboxEvent } from "@/server/realtime/outbox.service";
import { publishTransportMessage } from "@/server/realtime/transport";

type EmitDomainRealtimeEventInput = {
  eventName: RealtimeEventName;
  festivalId: string;
  entityType: string;
  entityId: string;
  roomKeys: string[];
  payload?: Record<string, unknown>;
  correlationId?: string;
  sequence?: number;
  actor?: RealtimeEnvelope["actor"];
};

export async function emitDomainRealtimeEvent(
  input: EmitDomainRealtimeEventInput,
) {
  if (!realtimeConfig.enabled) return;
  const envelope: RealtimeEnvelope = {
    eventId: createEventId(),
    eventName: input.eventName,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    festivalId: input.festivalId,
    entityType: input.entityType,
    entityId: input.entityId,
    correlationId: input.correlationId,
    idempotencyKey: createIdempotencyKey({
      eventName: input.eventName,
      entityId: input.entityId,
      sequence: input.sequence,
    }),
    sequence: input.sequence,
    actor: input.actor,
    payload: input.payload ?? {},
  };

  if (realtimeConfig.enableDualPublish) {
    await enqueueRealtimeOutboxEvent({
      envelope,
      roomKeys: input.roomKeys,
      actorUserId: input.actor?.id,
    });
    return;
  }

  await publishTransportMessage({
    envelope,
    roomKeys: input.roomKeys,
  });
}
