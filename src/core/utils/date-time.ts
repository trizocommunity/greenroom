export function parseStoredInstant(
  value: string | Date | null | undefined,
): Date {
  if (value == null || value === "") return new Date(NaN);
  if (value instanceof Date) return value;
  const raw = String(value).trim();
  if (/Z$/i.test(raw)) return new Date(raw);
  if (/[+-]\d{2}:?\d{2}$/.test(raw)) return new Date(raw);
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  return new Date(`${normalized}Z`);
}

export function formatStoredDateTime(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locales?: Intl.LocalesArgument,
): string {
  const date = parseStoredInstant(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locales, options).format(date);
}

export function toDateOrNull(value: string | Date | null | undefined): Date | null {
  const date = parseStoredInstant(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
