import "server-only";
import { getRedis } from "@/core/redis/client";

/**
 * Thin wrappers around Redis Pub/Sub for the SSE channels in Issue 46.
 *
 * The `publish()` helper is fire-and-forget; failures are logged but
 * don't propagate so the calling action completes even if Redis is
 * down (live updates degrade gracefully into 15s polling).
 *
 * The `subscribe()` helper returns a teardown function the SSE route
 * calls on disconnect. Each subscriber gets its own `duplicate()` so
 * multiple concurrent SSE clients don't share a connection.
 */

export async function publish(
  channel: string,
  payload: unknown,
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.warn(
      "[pubsub] publish failed (Redis unavailable):",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Subscribe to a channel and invoke the handler for each message.
 * Returns a teardown function the caller MUST call on disconnect.
 *
 * Each subscriber is an isolated connection (`redis.duplicate()`), so
 * one slow client cannot block another. If the handler throws, the
 * error is logged and the subscription stays open.
 */
export async function subscribe(
  channel: string,
  handler: (payload: unknown) => void | Promise<void>,
): Promise<() => Promise<void>> {
  const sub = getRedis().duplicate();
  await sub.subscribe(channel);
  sub.on("message", (_ch: string, msg: string) => {
    let payload: unknown = null;
    try {
      payload = JSON.parse(msg);
    } catch {
      // ignore malformed payloads
    }
    Promise.resolve(handler(payload)).catch((err) => {
      console.error("[pubsub] handler threw", err);
    });
  });
  return async () => {
    try {
      await sub.unsubscribe(channel);
      await sub.quit();
    } catch (err) {
      console.warn(
        "[pubsub] teardown error:",
        err instanceof Error ? err.message : err,
      );
    }
  };
}
