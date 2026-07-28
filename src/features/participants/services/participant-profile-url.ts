/**
 * Single source for participant profile URL path. All participants (leaders
 * included) share the same URL — leader-only sections are conditionally
 * rendered on the profile page itself, not isolated into a `/leader` subtree.
 * STANDARD+ feature; BASIC has no public participant profile page.
 */
export function getParticipantProfilePath(
  festivalSlug: string,
  participant: {
    profileSlug?: string | null;
    id?: string | null;
    isTeamLeader?: boolean | null;
  },
): string {
  const participantSlug = participant.profileSlug || participant.id;
  if (!participantSlug) {
    return `/${festivalSlug}`;
  }
  return `/${festivalSlug}/${participantSlug}`;
}

export function getParticipantProfileUrl(
  baseUrl: string,
  festivalSlug: string,
  participant: {
    profileSlug?: string | null;
    id?: string | null;
    isTeamLeader?: boolean | null;
  },
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${getParticipantProfilePath(festivalSlug, participant)}`;
}

/**
 * Generate chest number identifier for QR codes
 * Format: chestNumber (e.g., "01CS")
 */
export function getParticipantChestNumberId(participant: {
  chestNumber?: string | null;
  name?: string | null;
  id?: string | null;
}): string {
  return (
    participant.chestNumber || participant.name || participant.id || "unknown"
  );
}

/**
 * Generate QR code content for programme reporting
 * Returns chest number only (used for scanning attendance)
 */
export function getQrCodeContent(participant: {
  chestNumber?: string | null;
  name?: string | null;
  id?: string | null;
}): string {
  return getParticipantChestNumberId(participant);
}
