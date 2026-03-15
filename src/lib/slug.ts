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
 * Generate a unique profile slug for a student in a festival.
 * Format: slugify(name)-shortId, or with -2, -3 suffix if duplicate.
 */
export function generateProfileSlug(name: string, id: string): string {
  const base = slugify(name);
  const shortId = id.replace(/-/g, "").slice(0, 8);
  if (!base) return `s-${shortId}`;
  return `${base}-${shortId}`;
}
