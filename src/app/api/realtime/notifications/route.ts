import { realtimeConfig } from "@/lib/realtime-config";
import { authorizeRealtimeRoomJoin } from "@/server/realtime/authz";
import { realtimeObservability } from "@/server/realtime/observability";
import { resolveRealtimePrincipal } from "@/server/realtime/principal";
import { getRealtimeRedisSubscriber } from "@/server/realtime/redis";
import { RealtimeNotificationBus } from "@/server/services/realtime-notification-bus.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!realtimeConfig.enabled) {
    return new Response("Service Unavailable", { status: 503 });
  }

  const url = new URL(req.url);
  const studentId = url.searchParams.get("studentId");
  const roomsParam = url.searchParams.get("rooms");
  const requestedRooms = roomsParam
    ? roomsParam
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
    : [];
  const principal = await resolveRealtimePrincipal();
  const allowedRooms = requestedRooms.filter((room) =>
    authorizeRealtimeRoomJoin(principal, room),
  );
  if (!studentId && requestedRooms.length === 0) {
    return new Response("Bad Request", { status: 400 });
  }
  if (studentId) {
    if (!principal) return new Response("Unauthorized", { status: 401 });
    if (
      principal.principalType === "team-leader" &&
      principal.studentId !== studentId
    ) {
      return new Response("Forbidden", { status: 403 });
    }
  }
  if (requestedRooms.length > 0 && allowedRooms.length === 0) {
    return new Response("Unauthorized", { status: 401 });
  }

  let cleanup: (() => void) | null = null;
  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      const encoder = new TextEncoder();
      const write = (data: string) => controller.enqueue(encoder.encode(data));

      write("event: connected\ndata: ok\n\n");
      realtimeObservability.transportConnected("sse", {
        studentId: studentId ?? null,
        roomCount: allowedRooms.length,
      });

      const unsubscribe = RealtimeNotificationBus.subscribe((event) => {
        if (studentId && event.recipientStudentId !== studentId) return;
        if (
          allowedRooms.length > 0 &&
          !(event.rooms ?? []).some((room) => allowedRooms.includes(room))
        ) {
          return;
        }
        write(`data: ${JSON.stringify(event)}\n\n`);
      });

      const redisUnsubscribeFns: Array<() => Promise<void>> = [];
      const subscribeRedis = async () => {
        if (!realtimeConfig.redisUrl || allowedRooms.length === 0) return;
        const subscriber = await getRealtimeRedisSubscriber();
        for (const room of allowedRooms) {
          const topic = `realtime:${room}`;
          const handler = (message: string) => {
            write(`data: ${message}\n\n`);
          };
          await subscriber.subscribe(topic, handler);
          redisUnsubscribeFns.push(() =>
            subscriber.unsubscribe(topic, handler),
          );
        }
      };
      void subscribeRedis().catch((error) => {
        realtimeObservability.transportError("sse-redis-subscribe", {
          message: error instanceof Error ? error.message : "unknown",
        });
      });

      const heartbeat = setInterval(() => {
        write(": ping\n\n");
      }, 15000);

      const close = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(heartbeat);
        unsubscribe();
        for (const unsub of redisUnsubscribeFns) {
          void unsub();
        }
        realtimeObservability.transportDisconnected("sse", {
          studentId: studentId ?? null,
          roomCount: allowedRooms.length,
        });
      };
      cleanup = close;

      req.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
