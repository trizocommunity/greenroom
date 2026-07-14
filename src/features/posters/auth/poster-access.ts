import type { FestivalAccessRole } from "@/features/festivals/services/festival-context.service";

const DESIGN_TEMPLATE_ROLES = new Set([
  "SUPER_ADMIN",
  "OWNER",
  "ADMIN",
  "ANNOUNCER",
  "MEDIA",
]);

const DASHBOARD_POSTER_SWAP_ROLES = new Set([
  "SUPER_ADMIN",
  "OWNER",
  "ADMIN",
  "ANNOUNCER",
]);

const BASIC_POSTER_SWAP_ROLES = new Set(["SUPER_ADMIN", "OWNER", "ADMIN"]);

export function canManageDesignTemplates(role: FestivalAccessRole): boolean {
  return DESIGN_TEMPLATE_ROLES.has(role);
}

export function canSwapResultPosterOnDashboard(
  role: FestivalAccessRole,
  isBasic: boolean,
): boolean {
  if (isBasic) return BASIC_POSTER_SWAP_ROLES.has(role);
  return DASHBOARD_POSTER_SWAP_ROLES.has(role);
}

export function canSwapResultPosterOnPublicSite(isBasic: boolean): boolean {
  return !isBasic;
}
