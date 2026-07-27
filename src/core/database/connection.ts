import "server-only";

import type { PoolConfig } from "pg";

/**
 * Strip SSL-related query params so libpq's URL parser does not override the
 * explicit `ssl` object passed to `pg.Pool`. (Connection-string parser
 * replaces the config ssl object when sslmode/etc. are present, re-enabling
 * cert verification.)
 */
export function scrubConnectionString(connectionString: string): string {
  return connectionString
    .replace(/([?&])(sslmode|sslcert|sslkey|sslrootcert)=[^&]*/gi, (_m, p) =>
      p === "?" ? "?" : "",
    )
    .replace(/\?&+/, "?")
    .replace(/\?$/, "");
}

export function isLocalConnection(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return /localhost|127\.0\.0\.1|::1/i.test(connectionString);
  }
}

export function hasExplicitSslDisable(connectionString: string): boolean {
  return /sslmode=disable/i.test(connectionString);
}

export function buildSslConfig(connectionString: string): PoolConfig["ssl"] {
  if (
    isLocalConnection(connectionString) ||
    hasExplicitSslDisable(connectionString)
  ) {
    return false;
  }
  return { rejectUnauthorized: false };
}

/**
 * Production pool tuning for Neon: Neon's built-in PgBouncer already
 * multiplexes connections across serverless invocations, so the app-level
 * pool only needs to cover a single instance's own concurrency.
 */
export function buildPoolConfig(connectionString: string): PoolConfig {
  const cleaned = scrubConnectionString(connectionString);
  return {
    connectionString: cleaned || connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    maxLifetimeSeconds: 300,
    maxUses: 750,
    ssl: buildSslConfig(connectionString),
  };
}
