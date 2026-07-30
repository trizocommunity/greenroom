import "server-only";

import { cookies } from "next/headers";
import { stageFilterCookieName } from "./stage-filter-constants";

/**
 * Reads the stage manager's own "narrow to one of my stages" selection.
 * Returns null when unset or when the stored id isn't one of the caller's
 * currently-valid stage ids (deleted stage, no longer assigned, etc.).
 */
export async function getStageFilterCookie(
  festivalId: string,
  validStageIds: string[],
): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(stageFilterCookieName(festivalId))?.value;
  if (!value || !validStageIds.includes(value)) return null;
  return value;
}
