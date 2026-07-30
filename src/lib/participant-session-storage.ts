"use client";

export type ParticipantSessionMeta = {
  festivalSlug: string;
  participantSlug: string;
  isTeamLeader: boolean;
  expiresAt: string;
};

const KEY_PREFIX = "greenroom:participant-session:";

function keyFor(festivalSlug: string): string {
  return `${KEY_PREFIX}${festivalSlug}`;
}

export function readParticipantSessionMeta(
  festivalSlug: string,
): ParticipantSessionMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(festivalSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ParticipantSessionMeta>;
    if (
      typeof parsed.festivalSlug !== "string" ||
      typeof parsed.participantSlug !== "string" ||
      typeof parsed.isTeamLeader !== "boolean" ||
      typeof parsed.expiresAt !== "string"
    ) {
      return null;
    }
    if (parsed.festivalSlug !== festivalSlug) return null;
    const expiresAtMs = new Date(parsed.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      return null;
    }
    return {
      festivalSlug,
      participantSlug: parsed.participantSlug,
      isTeamLeader: parsed.isTeamLeader,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export function writeParticipantSessionMeta(
  meta: ParticipantSessionMeta,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      keyFor(meta.festivalSlug),
      JSON.stringify(meta),
    );
  } catch {
    // localStorage may be unavailable (private mode, quota) — silently ignore.
    // The httpOnly cookie remains the source of truth server-side.
  }
}

export function clearParticipantSessionMeta(festivalSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(festivalSlug));
  } catch {
    // ignore
  }
}
