import { RealtimeNotificationBus } from "@/server/services/realtime-notification-bus.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const studentId = url.searchParams.get("studentId");

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const write = (data: string) => controller.enqueue(encoder.encode(data));

      write("event: connected\ndata: ok\n\n");

      const unsubscribe = RealtimeNotificationBus.subscribe((event) => {
        if (studentId && event.recipientStudentId !== studentId) return;
        write(`data: ${JSON.stringify(event)}\n\n`);
      });

      const heartbeat = setInterval(() => {
        write(": ping\n\n");
      }, 15000);

      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };

      // @ts-expect-error - internal cleanup hook for stream cancellation
      controller._close = close;
    },
    cancel() {
      // no-op; cleanup is handled by request lifetime in runtime.
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
