/**
 * Re-export of the curated IANA timezone helpers and curated list from
 * `core/datetime`. This thin module gives call sites in the app a stable
 * import path that doesn't depend on the full `@/core/datetime` barrel.
 */
import {
  groupedTimezones,
  labelForTimezone,
  TZ_OPTIONS,
  zodTimezoneLoose,
} from "@/core/datetime";

export { groupedTimezones, labelForTimezone, TZ_OPTIONS, zodTimezoneLoose };
export type { TimezoneOption } from "@/core/datetime";
