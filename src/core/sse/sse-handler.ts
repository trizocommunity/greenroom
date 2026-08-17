import "server-only";
import { subscribe } from "@/core/pubsub/redis-pubsub";

type AuthResult = Response | null;
type RouteHandler<C> = (req: Request, ctx: C) => Promise<Response>;

/**
 * SSE handler factory. Wraps the boilerplate every Issue 46 SSE route
 * shares:
 *
 *   - Constructs a ReadableStream that pushes `data: <json>\n\n` frames
 *   - Heartbeats every 30s so Vercel's proxy doesn't kill the connection
 *   - Subscribes to a channel via Redis Pub/Sub
 *   - Tears down the subscription on `req.signal.abort`
 *
 * `channel` can be a string (single fixed channel) or a function
 * `(req, ctx) => Promise<string>` for routes that resolve the channel
 * from dynamic params.
 *
 * `auth` runs before any SSE setup and returns either `null` (allowed)
 * or a `Response` (denied — short-circuits before subscribing).
 */
export function sseHandler<C = unknown>(opts: {
  channel: string | ((req: Request, ctx: C) => Promise<string>);
  auth: (req: Request, ctx: C) => Promise<AuthResult>;
}): RouteHandler<C> {
  return async (req: Request, ctx: C) => {
    const denied = await opts.auth(req, ctx);
    if (denied) return denied;

    const channel =
      typeof opts.channel === "string"
        ? opts.channel
        : await opts.channel(req, ctx);

    let teardown: (() => Promise<void>) | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (frame: string) =>
          controller.enqueue(encoder.encode(frame));

        teardown = await subscribe(channel, (payload) => {
          send(`data: ${JSON.stringify(payload)}\n\n`);
        });

        heartbeat = setInterval(() => send(`: heartbeat\n\n`), 30_000);

        req.signal.addEventListener("abort", async () => {
          if (heartbeat) clearInterval(heartbeat);
          heartbeat = null;
          if (teardown) await teardown();
          teardown = null;
          try {
            controller.close();
          } catch {
            // already closed
          }
        });
      },
      async cancel() {
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = null;
        if (teardown) await teardown();
        teardown = null;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  };
}
