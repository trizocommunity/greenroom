import "server-only";

import { cookies } from "next/headers";
import {
  ALL_FESTIVAL_ROLES,
  roleSwitchCookieName,
  type SwitchableFestivalRole,
} from "./constants";

export async function getActiveRoleCookie(
  festivalId: string,
  validRoles: string[],
): Promise<SwitchableFestivalRole | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(roleSwitchCookieName(festivalId))?.value;
  if (
    !value ||
    !ALL_FESTIVAL_ROLES.includes(value as SwitchableFestivalRole) ||
    !validRoles.includes(value)
  ) {
    return null;
  }
  return value as SwitchableFestivalRole;
}
