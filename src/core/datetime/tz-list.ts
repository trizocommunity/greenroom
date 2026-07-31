/**
 * Curated IANA timezone list for dropdowns. Grouped by region so the
 * combobox can render a navigable structure. We keep ~80 entries — every
 * common populated zone, but not the full ~600 IANA list (which is
 * overwhelming in a dropdown).
 *
 * Each entry has:
 *   value  — IANA name (use this for storage and all `Intl` calls)
 *   label  — friendly display name
 *   offset — short-form UTC offset (informational; actual offset shifts
 *            with DST)
 *   region — grouping key for the combobox sections
 */

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  region: string;
}

export const TZ_OPTIONS: ReadonlyArray<TimezoneOption> = [
  // ─── UTC ────────────────────────────────────────────────────────────
  { value: "UTC", label: "UTC", offset: "UTC+00:00", region: "UTC" },

  // ─── Africa ─────────────────────────────────────────────────────────
  {
    value: "Africa/Algiers",
    label: "Algiers",
    offset: "UTC+01:00",
    region: "Africa",
  },
  {
    value: "Africa/Cairo",
    label: "Cairo",
    offset: "UTC+02:00",
    region: "Africa",
  },
  {
    value: "Africa/Casablanca",
    label: "Casablanca",
    offset: "UTC+01:00",
    region: "Africa",
  },
  {
    value: "Africa/Johannesburg",
    label: "Johannesburg",
    offset: "UTC+02:00",
    region: "Africa",
  },
  {
    value: "Africa/Lagos",
    label: "Lagos",
    offset: "UTC+01:00",
    region: "Africa",
  },
  {
    value: "Africa/Nairobi",
    label: "Nairobi",
    offset: "UTC+03:00",
    region: "Africa",
  },
  {
    value: "Africa/Tunis",
    label: "Tunis",
    offset: "UTC+01:00",
    region: "Africa",
  },

  // ─── Americas ───────────────────────────────────────────────────────
  {
    value: "America/Anchorage",
    label: "Anchorage",
    offset: "UTC−09:00",
    region: "Americas",
  },
  {
    value: "America/Argentina/Buenos_Aires",
    label: "Buenos Aires",
    offset: "UTC−03:00",
    region: "Americas",
  },
  {
    value: "America/Bogota",
    label: "Bogotá",
    offset: "UTC−05:00",
    region: "Americas",
  },
  {
    value: "America/Caracas",
    label: "Caracas",
    offset: "UTC−04:00",
    region: "Americas",
  },
  {
    value: "America/Chicago",
    label: "Chicago",
    offset: "UTC−06:00",
    region: "Americas",
  },
  {
    value: "America/Denver",
    label: "Denver",
    offset: "UTC−07:00",
    region: "Americas",
  },
  {
    value: "America/Halifax",
    label: "Halifax",
    offset: "UTC−04:00",
    region: "Americas",
  },
  {
    value: "America/Los_Angeles",
    label: "Los Angeles",
    offset: "UTC−08:00",
    region: "Americas",
  },
  {
    value: "America/Mexico_City",
    label: "Mexico City",
    offset: "UTC−06:00",
    region: "Americas",
  },
  {
    value: "America/New_York",
    label: "New York",
    offset: "UTC−05:00",
    region: "Americas",
  },
  {
    value: "America/Phoenix",
    label: "Phoenix",
    offset: "UTC−07:00",
    region: "Americas",
  },
  {
    value: "America/Santiago",
    label: "Santiago",
    offset: "UTC−04:00",
    region: "Americas",
  },
  {
    value: "America/Sao_Paulo",
    label: "São Paulo",
    offset: "UTC−03:00",
    region: "Americas",
  },
  {
    value: "America/Toronto",
    label: "Toronto",
    offset: "UTC−05:00",
    region: "Americas",
  },
  {
    value: "America/Vancouver",
    label: "Vancouver",
    offset: "UTC−08:00",
    region: "Americas",
  },

  // ─── Asia ───────────────────────────────────────────────────────────
  {
    value: "Asia/Bangkok",
    label: "Bangkok",
    offset: "UTC+07:00",
    region: "Asia",
  },
  { value: "Asia/Dhaka", label: "Dhaka", offset: "UTC+06:00", region: "Asia" },
  { value: "Asia/Dubai", label: "Dubai", offset: "UTC+04:00", region: "Asia" },
  {
    value: "Asia/Hong_Kong",
    label: "Hong Kong",
    offset: "UTC+08:00",
    region: "Asia",
  },
  {
    value: "Asia/Jakarta",
    label: "Jakarta",
    offset: "UTC+07:00",
    region: "Asia",
  },
  {
    value: "Asia/Jerusalem",
    label: "Jerusalem",
    offset: "UTC+02:00",
    region: "Asia",
  },
  {
    value: "Asia/Karachi",
    label: "Karachi",
    offset: "UTC+05:00",
    region: "Asia",
  },
  {
    value: "Asia/Kathmandu",
    label: "Kathmandu",
    offset: "UTC+05:45",
    region: "Asia",
  },
  {
    value: "Asia/Kolkata",
    label: "Kolkata (India)",
    offset: "UTC+05:30",
    region: "Asia",
  },
  {
    value: "Asia/Kuala_Lumpur",
    label: "Kuala Lumpur",
    offset: "UTC+08:00",
    region: "Asia",
  },
  {
    value: "Asia/Manila",
    label: "Manila",
    offset: "UTC+08:00",
    region: "Asia",
  },
  {
    value: "Asia/Riyadh",
    label: "Riyadh",
    offset: "UTC+03:00",
    region: "Asia",
  },
  { value: "Asia/Seoul", label: "Seoul", offset: "UTC+09:00", region: "Asia" },
  {
    value: "Asia/Shanghai",
    label: "Shanghai",
    offset: "UTC+08:00",
    region: "Asia",
  },
  {
    value: "Asia/Singapore",
    label: "Singapore",
    offset: "UTC+08:00",
    region: "Asia",
  },
  {
    value: "Asia/Taipei",
    label: "Taipei",
    offset: "UTC+08:00",
    region: "Asia",
  },
  {
    value: "Asia/Tehran",
    label: "Tehran",
    offset: "UTC+03:30",
    region: "Asia",
  },
  { value: "Asia/Tokyo", label: "Tokyo", offset: "UTC+09:00", region: "Asia" },
  {
    value: "Asia/Yangon",
    label: "Yangon",
    offset: "UTC+06:30",
    region: "Asia",
  },

  // ─── Atlantic ───────────────────────────────────────────────────────
  {
    value: "Atlantic/Azores",
    label: "Azores",
    offset: "UTC−01:00",
    region: "Atlantic",
  },
  {
    value: "Atlantic/Bermuda",
    label: "Bermuda",
    offset: "UTC−04:00",
    region: "Atlantic",
  },
  {
    value: "Atlantic/Canary",
    label: "Canary Islands",
    offset: "UTC+00:00",
    region: "Atlantic",
  },
  {
    value: "Atlantic/Reykjavik",
    label: "Reykjavík",
    offset: "UTC+00:00",
    region: "Atlantic",
  },

  // ─── Australia & Pacific ────────────────────────────────────────────
  {
    value: "Australia/Adelaide",
    label: "Adelaide",
    offset: "UTC+09:30",
    region: "Australia & Pacific",
  },
  {
    value: "Australia/Brisbane",
    label: "Brisbane",
    offset: "UTC+10:00",
    region: "Australia & Pacific",
  },
  {
    value: "Australia/Melbourne",
    label: "Melbourne",
    offset: "UTC+10:00",
    region: "Australia & Pacific",
  },
  {
    value: "Australia/Perth",
    label: "Perth",
    offset: "UTC+08:00",
    region: "Australia & Pacific",
  },
  {
    value: "Australia/Sydney",
    label: "Sydney",
    offset: "UTC+10:00",
    region: "Australia & Pacific",
  },
  {
    value: "Pacific/Auckland",
    label: "Auckland",
    offset: "UTC+12:00",
    region: "Australia & Pacific",
  },
  {
    value: "Pacific/Fiji",
    label: "Fiji",
    offset: "UTC+12:00",
    region: "Australia & Pacific",
  },
  {
    value: "Pacific/Guam",
    label: "Guam",
    offset: "UTC+10:00",
    region: "Australia & Pacific",
  },
  {
    value: "Pacific/Honolulu",
    label: "Honolulu",
    offset: "UTC−10:00",
    region: "Australia & Pacific",
  },
  {
    value: "Pacific/Tahiti",
    label: "Tahiti",
    offset: "UTC−10:00",
    region: "Australia & Pacific",
  },

  // ─── Europe ─────────────────────────────────────────────────────────
  {
    value: "Europe/Amsterdam",
    label: "Amsterdam",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Athens",
    label: "Athens",
    offset: "UTC+02:00",
    region: "Europe",
  },
  {
    value: "Europe/Belgrade",
    label: "Belgrade",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Berlin",
    label: "Berlin",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Brussels",
    label: "Brussels",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Bucharest",
    label: "Bucharest",
    offset: "UTC+02:00",
    region: "Europe",
  },
  {
    value: "Europe/Budapest",
    label: "Budapest",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Copenhagen",
    label: "Copenhagen",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Dublin",
    label: "Dublin",
    offset: "UTC+00:00",
    region: "Europe",
  },
  {
    value: "Europe/Helsinki",
    label: "Helsinki",
    offset: "UTC+02:00",
    region: "Europe",
  },
  {
    value: "Europe/Istanbul",
    label: "Istanbul",
    offset: "UTC+03:00",
    region: "Europe",
  },
  {
    value: "Europe/Kiev",
    label: "Kyiv",
    offset: "UTC+02:00",
    region: "Europe",
  },
  {
    value: "Europe/Lisbon",
    label: "Lisbon",
    offset: "UTC+00:00",
    region: "Europe",
  },
  {
    value: "Europe/London",
    label: "London",
    offset: "UTC+00:00",
    region: "Europe",
  },
  {
    value: "Europe/Madrid",
    label: "Madrid",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Moscow",
    label: "Moscow",
    offset: "UTC+03:00",
    region: "Europe",
  },
  {
    value: "Europe/Oslo",
    label: "Oslo",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Paris",
    label: "Paris",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Prague",
    label: "Prague",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Rome",
    label: "Rome",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Stockholm",
    label: "Stockholm",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Vienna",
    label: "Vienna",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Warsaw",
    label: "Warsaw",
    offset: "UTC+01:00",
    region: "Europe",
  },
  {
    value: "Europe/Zurich",
    label: "Zurich",
    offset: "UTC+01:00",
    region: "Europe",
  },

  // ─── Indian Ocean ───────────────────────────────────────────────────
  {
    value: "Indian/Maldives",
    label: "Maldives",
    offset: "UTC+05:00",
    region: "Indian Ocean",
  },
  {
    value: "Indian/Mauritius",
    label: "Mauritius",
    offset: "UTC+04:00",
    region: "Indian Ocean",
  },
  {
    value: "Indian/Reunion",
    label: "Réunion",
    offset: "UTC+04:00",
    region: "Indian Ocean",
  },
];

/**
 * Group the curated list by region. The combobox iterates this and
 * renders a section header per region.
 */
export function groupedTimezones(): Array<{
  region: string;
  options: ReadonlyArray<TimezoneOption>;
}> {
  const map = new Map<string, TimezoneOption[]>();
  for (const opt of TZ_OPTIONS) {
    const arr = map.get(opt.region);
    if (arr) {
      arr.push(opt);
    } else {
      map.set(opt.region, [opt]);
    }
  }
  return Array.from(map.entries()).map(([region, options]) => ({
    region,
    options,
  }));
}

/**
 * Look up a label by IANA name; returns the IANA name itself if not in
 * the curated list (so the UI never silently drops a user's value).
 */
export function labelForTimezone(value: string): string {
  const found = TZ_OPTIONS.find((opt) => opt.value === value);
  return found ? found.label : value;
}
