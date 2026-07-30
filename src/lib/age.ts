import { parseStoredInstant } from "@/core/utils/date-time";

/**
 * Compute age (whole years) from a stored date-of-birth string.
 * Returns `null` for invalid / missing input so callers can decide whether to
 * hide the value or surface a "—" placeholder.
 */
export function computeAgeFromDateOfBirth(
  value: string | Date | null | undefined,
): number | null {
  const dob = parseStoredInstant(value);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}
