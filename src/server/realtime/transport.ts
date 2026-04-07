import { EventEmitter } from "node:events";
import { realtimeConfig } from "@/lib/realtime-config";
import type { RealtimeEnvelope } from "@/server/realtime/events";
import { realtimeObservability } from "@/server/realtime/observability";
import { getRealtimeRedisClient } from "@/server/realtime/redis";
import { RealtimeNotificationBus } from "@/server/services/realtime-notification-bus.service";

const emitter = new EventEmitter();
emitter.setMaxListeners(500);

type RealtimeTransportPayload = {
  envelope: RealtimeEnvelope;
  roomKeys: string[];
};

const EVENT_NAME = "realtime-message";

function getRedisTopic(room: string): string {
  return `realtime:${room}`;
}

export async function publishTransportMessage(
  payload: RealtimeTransportPayload,
) {
  if (!realtimeConfig.enabled) return;
  emitter.emit(EVENT_NAME, payload);
  RealtimeNotificationBus.publish({
    eventId: payload.envelope.eventId,
    festivalId: payload.envelope.festivalId,
    type: payload.envelope.eventName,
    payload: payload.envelope.payload,
    createdAt: payload.envelope.occurredAt,
    rooms: payload.roomKeys,
  });

  if (!realtimeConfig.redisUrl) return;
  const client = await getRealtimeRedisClient();
  await Promise.all(
    payload.roomKeys.map((room) =>
      client.publish(getRedisTopic(room), JSON.stringify(payload.envelope)),
    ),
  );
  realtimeObservability.eventDispatched("redis-pubsub", {
    eventName: payload.envelope.eventName,
    roomCount: payload.roomKeys.length,
  });
}

export function subscribeTransportMessage(
  listener: (payload: RealtimeTransportPayload) => void,
) {
  emitter.on(EVENT_NAME, listener);
  return () => {
    emitter.off(EVENT_NAME, listener);
  };
}
