"use server";

import { MemberService } from "@/server/services/member.service";
import { revalidatePath } from "next/cache";

export async function getMembersAction(festivalId: string) {
  return MemberService.getMembers(festivalId);
}

export async function createTeamLeaderAction(
  festivalId: string,
  groupId: string,
  data: {
    fullName: string;
    email: string;
    password: string;
  },
) {
  try {
    const result = await MemberService.createTeamLeader(
      festivalId,
      groupId,
      data,
    );
    revalidatePath(`/festival/${festivalId}/pre-works/groups`);
    revalidatePath(`/festival/${festivalId}/members`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
