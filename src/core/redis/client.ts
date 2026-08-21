import "server-only";
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function isBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-development-build"
  );
}

/**
 * Lazy ioredis construction. The singleton is built on first access so the
 * `next build` "Collecting page data" phase can import this module without
 * throwing when `REDIS_URL` is unset (e.g. during CI builds that don't need
 * Redis). Mirrors `src/core/database/client.ts`.
 */
export function getRedis(): Redis {
  if (globalForRedis.redis) return globalForRedis.redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "REDIS_URL is not set. Local dev: `docker compose up -d` or set REDIS_URL in .env.local. Prod: configure in Vercel Environment Variables.",
    );
  }

  if (isBuildPhase()) {
    throw new Error(
      "Redis client accessed during build phase (REDIS_URL likely not set)",
    );
  }

  const isTls = url.startsWith("rediss://");

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 10_000,
    commandTimeout: 5_000,
    tls: isTls ? {} : undefined,
    reconnectOnError: (err) =>
      ["READONLY", "ECONNRESET", "ETIMEDOUT"].some((t) =>
        err.message.includes(t),
      ),
  });

  client.on("connect", () => {
    console.info("[redis] connected");
  });
  client.on("ready", () => {
    console.info("[redis] ready");
  });
  client.on("reconnecting", () => {
    console.warn("[redis] reconnecting");
  });
  client.on("error", (err) => {
    console.error("[redis] error", err.message);
  });
  client.on("end", () => {
    console.warn("[redis] connection ended");
  });

  if (process.env.NODE_ENV !== "production") {
    globalForRedis.redis = client;
  }

  return client;
}
