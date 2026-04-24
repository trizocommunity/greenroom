import { drizzle } from "drizzle-orm/node-postgres";
import * as relations from "./relations";
import * as schema from "./schema";

const dbSchema = { ...schema, ...relations };

import { Pool, type PoolConfig } from "pg";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
  db: ReturnType<typeof drizzle<typeof dbSchema>> | undefined;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not defined");

// Strip SSL params from URL so pg doesn't override our ssl config (connection-string parser
// replaces the config ssl object when sslmode/etc. are present, re-enabling cert verification).
const cleanedConnectionString = connectionString
  .replace(/([?&])(sslmode|sslcert|sslkey|sslrootcert)=[^&]*/gi, (m, p) =>
    p === "?" ? "?" : "",
  )
  .replace(/\?&+/, "?")
  .replace(/\?$/, "");

const effectiveConnectionString = cleanedConnectionString || connectionString;

const isLocalConnection = (() => {
  try {
    const url = new URL(effectiveConnectionString);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return /localhost|127\.0\.0\.1|::1/i.test(effectiveConnectionString);
  }
})();

const hasExplicitSslDisable = /sslmode=disable/i.test(connectionString);
const sslConfig: PoolConfig["ssl"] =
  isLocalConnection || hasExplicitSslDisable
    ? false
    : { rejectUnauthorized: false };

const poolConfig: PoolConfig = {
  connectionString: effectiveConnectionString,
  max: process.env.NODE_ENV === "production" ? 10 : 5, // Increased max connections slightly
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: sslConfig,
};

if (!globalForDb.pool) {
  globalForDb.pool = new Pool(poolConfig);
}
export const pool = globalForDb.pool;

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

pool.on("error", (err) => console.error("Database pool error:", err));

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
