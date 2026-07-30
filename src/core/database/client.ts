import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import * as relations from "./relations";
import * as schema from "./schema";

const dbSchema = { ...schema, ...relations };

import { Pool, type PoolConfig } from "pg";
import { buildPoolConfig, scrubConnectionString } from "./connection";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
  db: ReturnType<typeof drizzle<typeof dbSchema>> | undefined;
};

const rawConnectionString = process.env.DATABASE_URL;
if (!rawConnectionString) throw new Error("DATABASE_URL is not defined");

const connectionString =
  scrubConnectionString(rawConnectionString) || rawConnectionString;
const poolConfig: PoolConfig = buildPoolConfig(rawConnectionString);

if (!globalForDb.pool) {
  globalForDb.pool = new Pool(poolConfig);
}
export const pool = globalForDb.pool;

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

if (!globalForDb.db) {
  globalForDb.db = drizzle(pool, { schema: dbSchema });
}
export const db = globalForDb.db;

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

// Graceful shutdown (production only, skip build)
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  const shutdown = async () => {
    await pool.end();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Capture pool-level errors. In production, surface to Sentry so we don't
// silently swallow transient pgBouncer / Postgres disconnects.
pool.on("error", (err) => {
  console.error("Database pool error:", err);
  if (process.env.NODE_ENV === "production") {
    try {
      // Lazy require — @sentry/nextjs only resolves in runtime bundles.
      const { captureException } =
        require("@sentry/nextjs") as typeof import("@sentry/nextjs");
      captureException(err, { tags: { area: "pg-pool" } });
    } catch {
      // Sentry not initialized; ignore.
    }
  }
});
