/**
 * Single source for student profile public URL: /{festivalSlug}/{profileSlug}.
 * STANDARD+ feature; BASIC has no public student profile page.
 */
export function getStudentProfileUrl(
  baseUrl: string,
  festivalSlug: string,
  student: { profileSlug?: string | null },
): string {
  const base = baseUrl.replace(/\/$/, "");
  if (!student.profileSlug) {
    return `${base}/${festivalSlug}`;
  }
  return `${base}/${festivalSlug}/${student.profileSlug}`;
}
