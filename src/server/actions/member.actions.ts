"use server";

import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors";
import { MemberService } from "@/server/services/member.service";
import type { ActionResponse } from "@/types/actions";

export async function getMembersAction(festivalId: string) {
  return MemberService.getMembers(festivalId);
}

export async function addMemberAction(
  festivalId: string,
  data: {
    fullName: string;
    email: string;
    role: "ADMIN" | "ANNOUNCER" | "STAGE_MANAGER";
  },
): Promise<ActionResponse<Awaited<ReturnType<typeof MemberService.addMember>>>> {
  try {
    const result = await MemberService.addMember(festivalId, data);
    revalidatePath(`/festival/${festivalId}/members`);
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
    await MemberService.removeMember(festivalId, memberId);
    revalidatePath(`/festival/${festivalId}/members`);
    return { success: true, data: null };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}
