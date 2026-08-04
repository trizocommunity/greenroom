"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSession } from "@/core/auth/session";
import {
  ALL_FESTIVAL_ROLES,
  PRIVILEGED_ROLES,
  roleSwitchCookieName,
  type SwitchableFestivalRole,
} from "../constants";

export async function switchRoleAction(
  festivalId: string,
  festivalSlug: string,
  targetRole: string,
  actualRole: string,
  memberRoles: string[],
) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  if (!ALL_FESTIVAL_ROLES.includes(targetRole as SwitchableFestivalRole)) {
    return { error: "Invalid role" };
  }

  const isPrivileged = PRIVILEGED_ROLES.includes(actualRole as any);
  if (!isPrivileged && !memberRoles.includes(targetRole)) {
    return { error: "You don't have access to this role" };
  }

  const cookieStore = await cookies();
  cookieStore.set(roleSwitchCookieName(festivalId), targetRole, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: `/dashboard/${festivalSlug}`,
  });

  revalidatePath(`/dashboard/${festivalSlug}`, "layout");
  return { success: true };
}

export async function clearRoleSwitchAction(
  festivalId: string,
  festivalSlug: string,
) {
  const session = await getSession();
  if (!session?.userId) {
    return { error: "Unauthorized" };
  }

  const cookieStore = await cookies();
  cookieStore.delete({
    name: roleSwitchCookieName(festivalId),
    path: `/dashboard/${festivalSlug}`,
  });

  revalidatePath(`/dashboard/${festivalSlug}`, "layout");
  return { success: true };
}
