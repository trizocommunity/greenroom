/** Shared expiry check for public + portal surfaces. */
export function isFestivalExpired(festival: {
  status?: string | null;
  expiresAt?: string | Date | null;
}): boolean {
  if (festival.status === "EXPIRED") return true;
  if (!festival.expiresAt) return false;
  return new Date(festival.expiresAt).getTime() < Date.now();
}
