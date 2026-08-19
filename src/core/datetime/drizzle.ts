import {
  type PgTimestampConfig,
  type PgTimestampStringBuilderInitial,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Canonical configuration for every persisted timestamp column in this
 * project. Use this everywhere instead of repeating the options object
 * at each call site.
 *
 *   - `withTimezone: true` — Postgres `timestamptz(3)`. Storage is
 *     always UTC; display is always the viewer's browser-local time
 *     (see `format.ts`, no `tz` parameter).
 *   - `precision: 3`       — millisecond accuracy, matching the
 *     existing convention (and the prior `timestamp(3)` columns).
 *   - `mode: "string"`     — keep the JS-level type as ISO string.
 *     Pair with `parseInstant` (see `parse.ts`) for safe parsing.
 */
export const tzTimestampConfig: PgTimestampConfig<"string"> = {
  withTimezone: true,
  precision: 3,
  mode: "string",
};

/**
 * Build a Drizzle timestamptz column with the project's canonical
 * configuration. Use this for every new timestamp column.
 *
 *   createdAt: tzTimestamp().default(currentTimestampSql()).notNull()
 *   expiresAt: tzTimestamp()                              // nullable
 *   expiresAt: tzTimestamp().notNull()                   // required
 */
export function tzTimestamp(): PgTimestampStringBuilderInitial<""> {
  return timestamp(tzTimestampConfig);
}

/**
 * Same as `tzTimestamp()` but with an explicit column name. Use only
 * when the JS property name doesn't match the desired SQL column name.
 * For new code prefer `tzTimestamp()`.
 */
export function tzTimestampNamed<TName extends string>(
  name: TName,
): PgTimestampStringBuilderInitial<TName> {
  return timestamp(name, tzTimestampConfig);
}
