"use server";

import { MemberService } from "@/server/services/member.service";
import { revalidatePath } from "next/cache";

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
) {
  try {
    const result = await MemberService.addMember(festivalId, data);
    revalidatePath(`/festival/${festivalId}/members`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeMemberAction(festivalId: string, memberId: string) {
  try {
    await MemberService.removeMember(festivalId, memberId);
    revalidatePath(`/festival/${festivalId}/members`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
