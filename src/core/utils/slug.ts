/**
 * URL-safe slug from a name (lowercase, spaces to hyphens, strip non-alphanumeric).
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a unique profile slug for a participant in a festival.
 * Format: slugify(name)-chestNumber, fallback to slugify(name)-shortId if missing.
 */
export function generateProfileSlug(
  name: string,
  id: string,
  chestNumber?: string | null,
): string {
  const base = slugify(name);
  let tail = "";
  if (chestNumber) {
    tail = slugify(chestNumber);
  } else {
    // We expect uuid, but just in case, guard length to prevent errors.
    tail = id.replace(/-/g, "").slice(0, 8);
  }

  if (!base) return `s-${tail}`;
  return `${base}-${tail}`;
}
