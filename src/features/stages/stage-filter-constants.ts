export const STAGE_FILTER_COOKIE_PREFIX = "sm_stage_filter_";
export const ALL_STAGES_VALUE = "__all__";

export function stageFilterCookieName(festivalId: string): string {
  return `${STAGE_FILTER_COOKIE_PREFIX}${festivalId}`;
}
