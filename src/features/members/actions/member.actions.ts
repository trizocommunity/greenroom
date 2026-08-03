"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/core/auth/assert-festival-access";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { festival as festivalTable } from "@/core/database/schema";
import { handleActionError } from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import { MemberService } from "@/features/members/services/member.service";

export async function getMembersAction(festivalId: string) {
  const session = await getSession();
  await assertFestivalAccess(session, festivalId);
  return MemberService.getMembers(festivalId);
}

export async function addMemberAction(
  festivalId: string,
  data: {
    fullName: string;
    email: string;
    role: "ADMIN" | "ANNOUNCER" | "STAGE_MANAGER";
  },
): Promise<
  ActionResponse<Awaited<ReturnType<typeof MemberService.addMember>>>
> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId, { requireWritable: true });
    const result = await MemberService.addMember(festivalId, data);
    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      columns: { slug: true },
    });
    if (festival) revalidatePath(`/dashboard/${festival.slug}/members`);
    return { success: true, data: result };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

export async function updateMemberRolesAction(
  festivalId: string,
  memberId: string,
  roles: string[],
): Promise<ActionResponse<Awaited<ReturnType<typeof MemberService.updateMemberRoles>>>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId, { requireWritable: true });
    const result = await MemberService.updateMemberRoles(
      festivalId,
      memberId,
      roles,
    );
    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      columns: { slug: true },
    });
    if (festival) revalidatePath(`/dashboard/${festival.slug}/members`);
    return { success: true, data: result };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

export async function removeMemberAction(
  festivalId: string,
  memberId: string,
): Promise<ActionResponse<null>> {
  try {
    const session = await getSession();
    await assertFestivalAccess(session, festivalId, { requireWritable: true });
    await MemberService.removeMember(festivalId, memberId);
    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      columns: { slug: true },
    });
    if (festival) revalidatePath(`/dashboard/${festival.slug}/members`);
    return { success: true, data: null };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}
