import "server-only";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import { buildPoolConfig } from "./connection";
import * as relations from "./relations";
import * as schema from "./schema";

const dbSchema = { ...schema, ...relations };

type Db = NodePgDatabase<typeof dbSchema>;

let _pool: Pool | undefined;
let _db: Db | undefined;
let _shutdownRegistered = false;

function isBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-development-build"
  );
}

function handlePoolError(err: Error): void {
  console.error("Database pool error:", err);
}

function registerShutdown(pool: Pool): void {
  if (_shutdownRegistered) return;
  _shutdownRegistered = true;
  const shutdown = async () => {
    await pool.end();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

/**
 * Lazy pool construction. We defer reading `process.env.DATABASE_URL` and
 * creating the `pg.Pool` until the first call so that `next build`'s
 * "Collecting page data" phase can statically import this module without
 * throwing when the env var is unavailable.
 */
export function getPool(): Pool {
  if (_pool) return _pool;
  if (isBuildPhase()) {
    throw new Error(
      "Database pool accessed during build phase (DATABASE_URL likely not set)",
    );
  }
  const rawConnectionString = process.env.DATABASE_URL;
  if (!rawConnectionString) throw new Error("DATABASE_URL is not defined");
  const poolConfig: PoolConfig = buildPoolConfig(rawConnectionString);
  const pool = new Pool(poolConfig);
  pool.on("error", handlePoolError);
  if (process.env.NODE_ENV === "production") {
    registerShutdown(pool);
  }
  _pool = pool;
  return pool;
}

export function getDb(): Db {
  if (_db) return _db;
  _db = drizzle(getPool(), { schema: dbSchema });
  return _db;
}

/**
 * Proxy so existing `db.select()` / `db.transaction(...)` call sites work
 * unchanged. Each property access goes through `getDb()`, which lazily
 * constructs the pool on first use.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: never[]) => unknown).bind(real)
      : value;
  },
}) as Db;

/**
 * Direct pool access for code that needs `pool.query(...)` or `pool.end()`.
 * Lazy — same construction rules as `getDb()`.
 */
export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const real = getPool() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: never[]) => unknown).bind(real)
      : value;
  },
}) as Pool;
