import "server-only";
import { type Cache, createCache } from "@/core/cache";
import { getRedis } from "@/core/redis/client";

/**
 * Default cache instance wired to the platform's Redis singleton.
 *
 * Most feature code should import this directly. Tests inject their own
 * client via `createCache({ redis })` to avoid touching the singleton.
 *
 * Lazy: the singleton is built on first method call so the `next build`
 * "Collecting page data" phase and Testcontainers forks can import this
 * module without `REDIS_URL` being set yet.
 */
export const cache: Cache = new Proxy({} as Cache, {
  get(_target, prop, receiver) {
    const real = createCache({ redis: getRedis() }) as unknown as Record<
      PropertyKey,
      unknown
    >;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: never[]) => unknown).bind(real)
      : value;
  },
});
