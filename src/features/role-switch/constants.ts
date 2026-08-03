export const ROLE_SWITCH_COOKIE_PREFIX = "active_role_";

export const ALL_FESTIVAL_ROLES = [
  "ADMIN",
  "ANNOUNCER",
  "STAGE_MANAGER",
  "MEDIA",
] as const;

export type SwitchableFestivalRole = (typeof ALL_FESTIVAL_ROLES)[number];

export function roleSwitchCookieName(festivalId: string): string {
  return `${ROLE_SWITCH_COOKIE_PREFIX}${festivalId}`;
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OWNER: "Owner",
  ADMIN: "Admin",
  ANNOUNCER: "Announcer",
  STAGE_MANAGER: "Stage Manager",
  MEDIA: "Media",
};

export const PRIVILEGED_ROLES = ["SUPER_ADMIN", "OWNER", "ADMIN"] as const;
