"use server";

import { revalidatePath } from "next/cache";
import { assertFestivalAccess } from "@/lib/auth/assert-festival-access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { handleActionError } from "@/lib/errors";
import { MemberService } from "@/server/services/member.service";
import type { ActionResponse } from "@/types/actions";

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
    const festival = await prisma.festival.findUnique({
      where: { id: festivalId },
      select: { slug: true },
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
    const festival = await prisma.festival.findUnique({
      where: { id: festivalId },
      select: { slug: true },
    });
    if (festival) revalidatePath(`/dashboard/${festival.slug}/members`);
    return { success: true, data: null };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}
