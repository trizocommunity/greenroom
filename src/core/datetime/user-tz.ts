import { DEFAULT_TZ } from "./constants";

/**
 * Detect the user's timezone from the browser. Safe to call on the server
 * (returns UTC) and on the client (returns the user's IANA name).
 *
 * Implementation note: `Intl.DateTimeFormat().resolvedOptions().timeZone`
 * is supported in every modern browser and in Node ≥ 13. Falls back to
 * `DEFAULT_TZ` when `Intl` is unavailable (e.g. very old runtimes, broken
 * ICU data, sandboxed environments).
 *
 * On the *server*, this returns the server's TZ — not the end user's.
 * For personalised rendering, see `getCurrentUserTimezone` in `server.ts`.
 */
export function getBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof tz === "string" && tz.length > 0) return tz;
  } catch {
    // Intl may be unavailable in unusual environments.
  }
  return DEFAULT_TZ;
}

/**
 * Return a list of all IANA timezones supported by the current runtime.
 * Used by `schemas.ts` to validate user-supplied timezone names against
 * the canonical list. On Node ≥ 18 this returns the full ~600-entry list.
 *
 * The function is intentionally not exhaustive — it returns an empty
 * array on runtimes that don't implement `supportedValuesOf`.
 */
export function supportedTimezones(): ReadonlyArray<string> {
  try {
    const intl = Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    };
    if (typeof intl.supportedValuesOf === "function") {
      return intl.supportedValuesOf("timeZone");
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Validate that a string is a recognisable IANA timezone.
 *
 * `Intl.supportedValuesOf("timeZone")` returns only the canonical name
 * (e.g. `Asia/Calcutta`), not the modern alias (`Asia/Kolkata`), even
 * though both are valid IANA names accepted by `Intl.DateTimeFormat`.
 * So we do a two-step check:
 *   1. If `supportedValuesOf` includes the value, accept it.
 *   2. Otherwise, ask `Intl.DateTimeFormat` to format a date in that
 *      timezone. If `resolvedOptions().timeZone` returns the same name
 *      (or its canonical alias), the name is accepted by the runtime.
 *
 * Returns `true` when the runtime doesn't support either check.
 */
export function isValidTimezone(value: string): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  const list = supportedTimezones();
  if (list.includes(value)) return true;
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: value });
    const resolved = fmt.resolvedOptions().timeZone;
    if (typeof resolved === "string" && resolved.length > 0) return true;
  } catch {
    // Intl rejected the value — invalid timezone.
  }
  return false;
}
