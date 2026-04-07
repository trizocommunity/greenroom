import crypto from "node:crypto";

export type RealtimeEventName =
  | "reporting.updated"
  | "reporting.participant_marked"
  | "judgment.link_created"
  | "judgment.submitted"
  | "results.publish_toggled"
  | "standings.updated"
  | "programme.status_changed"
  | "notification.created";

export type RealtimeEnvelope<TPayload = Record<string, unknown>> = {
  eventId: string;
  eventName: RealtimeEventName;
  eventVersion: number;
  occurredAt: string;
  correlationId?: string;
  idempotencyKey: string;
  festivalId: string;
  entityType: string;
  entityId: string;
  sequence?: number;
  actor?: {
    id?: string | null;
    type?: string;
    name?: string | null;
  };
  payload: TPayload;
};

export function createEventId(): string {
  return crypto.randomUUID();
}

export function createIdempotencyKey(input: {
  eventName: RealtimeEventName;
  entityId: string;
  sequence?: number | null;
}): string {
  return `${input.eventName}:${input.entityId}:${input.sequence ?? "na"}`;
}
