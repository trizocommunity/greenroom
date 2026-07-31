/**
 * @deprecated Use the helpers from `@/core/datetime` directly:
 *   - `parseStoredInstant` → `parseInstant`
 *   - `toDateOrNull`       → `toDateOrNull` (now in `@/core/datetime`)
 *   - `formatStoredDateTime` → `formatDate` / `formatDateTime` with `tz`
 *
 * This shim exists only until every call site is migrated. New imports
 * are forbidden by the Biome guardrail (see `biome.json` overrides).
 *
 * Behaviors preserved from the legacy helper:
 *   - `parseStoredInstant` returns `new Date(NaN)` for invalid input
 *     (matches the legacy function's "Date | Invalid-Date" contract).
 *   - `formatStoredDateTime` accepts `(value, options, locales)` and
 *     falls back to `"—"` for invalid input.
 */
import { parseInstant } from "@/core/datetime";

export function parseStoredInstant(
  value: string | Date | null | undefined,
): Date {
  const parsed = parseInstant(value);
  return parsed ?? new Date(NaN);
}

export function toDateOrNull(
  value: string | Date | null | undefined,
): Date | null {
  return parseInstant(value);
}

export function formatStoredDateTime(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locales?: Intl.LocalesArgument,
): string {
  const date = parseInstant(value);
  if (date === null) return "—";
  try {
    return new Intl.DateTimeFormat(locales, options).format(date);
  } catch {
    return "—";
  }
}
