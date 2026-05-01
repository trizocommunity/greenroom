/**
 * Single source for student profile URL path:
 * - Non-leader: /{festivalSlug}/{studentSlug}
 * - Leader: /{festivalSlug}/{studentSlug}/leader
 * STANDARD+ feature; BASIC has no public student profile page.
 */
export function getStudentProfilePath(
  festivalSlug: string,
  student: {
    profileSlug?: string | null;
    id?: string | null;
    isTeamLeader?: boolean | null;
  },
): string {
  const studentSlug = student.profileSlug || student.id;
  if (!studentSlug) {
    return `/${festivalSlug}`;
  }
  if (student.isTeamLeader) {
    return `/${festivalSlug}/${studentSlug}/leader`;
  }
  return `/${festivalSlug}/${studentSlug}`;
}

export function getStudentProfileUrl(
  baseUrl: string,
  festivalSlug: string,
  student: {
    profileSlug?: string | null;
    id?: string | null;
    isTeamLeader?: boolean | null;
  },
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${getStudentProfilePath(festivalSlug, student)}`;
}

/**
 * Generate chest number identifier for QR codes
 * Format: chestNumber (e.g., "01CS")
 */
export function getStudentChestNumberId(student: {
  chestNumber?: string | null;
  name?: string | null;
  id?: string | null;
}): string {
  return student.chestNumber || student.name || student.id || "unknown";
}

/**
 * Generate QR code content for programme reporting
 * Returns chest number only (used for scanning attendance)
 */
export function getQrCodeContent(student: {
  chestNumber?: string | null;
  name?: string | null;
  id?: string | null;
}): string {
  return getStudentChestNumberId(student);
}
