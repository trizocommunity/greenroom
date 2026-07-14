/**
 * Retries operations when node-postgres connection drops mid-flight.
 * Handles transient network or database connection drops.
 */

const MESSAGE_MARKERS = [
  "Connection terminated unexpectedly",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "timeout exceeded when trying to connect",
  "the database system is shutting down",
  "server closed the connection",
] as const;

/** Postgres / libpq codes that are often transient when using poolers. */
const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
]);

export function isTransientDbError(err: unknown): boolean {
  const seen = new Set<unknown>();
  let e: unknown = err;

  while (e && typeof e === "object" && !seen.has(e)) {
    seen.add(e);
    const any = e as Record<string, unknown>;
    const code = any.code;
    if (typeof code === "string" && TRANSIENT_CODES.has(code)) {
      return true;
    }
    const msg =
      typeof any.message === "string" ? any.message : String(any.message ?? "");
    if (MESSAGE_MARKERS.some((m) => msg.includes(m))) {
      return true;
    }
    e = any.cause;
  }

  return false;
}

export type WithDbRetryOptions = {
  /** Extra attempts after the first failure (default 2 → up to 3 tries). */
  retries?: number;
};

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options?: WithDbRetryOptions,
): Promise<T> {
  const retries = options?.retries ?? 2;
  let last: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (e) {
      last = e;
      if (attempt >= retries || !isTransientDbError(e)) {
        throw e;
      }
      await new Promise((r) => setTimeout(r, 75 * (attempt + 1)));
    }
  }

  throw last;
}
