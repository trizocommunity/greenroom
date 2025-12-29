import { hash } from "bcryptjs";
import {
  createMember,
  findMembersByFestival,
  findMemberByFestivalAndUser,
} from "@/server/models/member.model";
import { findUserByEmail, createUser } from "@/server/models/user.model";
import { findGroupById } from "@/server/models/group.model";
import type { Prisma } from "@prisma/client";

export const MemberService = {
  async getMembers(festivalId: string) {
    return findMembersByFestival(festivalId);
  },

  async getTeamLeaders(festivalId: string) {
    return findMembersByFestival(festivalId, {
      role: "TEAM_LEADER",
    });
  },

  async createTeamLeader(
    festivalId: string,
    groupId: string,
    data: {
      fullName: string;
      email: string;
      password: string;
    },
  ) {
    // 1. Verify Group belongs to Festival
    const group = await findGroupById(groupId);
    if (!group || group.festivalId !== festivalId) {
      throw new Error("Invalid group.");
    }

    // 2. Check if User exists
    let user = await findUserByEmail(data.email);

    if (!user) {
      // Create new User
      const hashedPassword = await hash(data.password, 10);
      user = await createUser({
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        displayName: data.fullName, // Default display name
      });
    }

    // 3. Check if already a member of this festival
    const existingMember = await findMemberByFestivalAndUser(
      festivalId,
      user.id,
    );
    if (existingMember) {
      throw new Error("User is already a member of this festival.");
    }

    // 4. Create Member linked to Group
    return createMember({
      festival: { connect: { id: festivalId } },
      user: { connect: { id: user.id } },
      group: { connect: { id: groupId } },
      role: "TEAM_LEADER",
    });
  },

  async updateTeamLeader(
    festivalId: string,
    memberId: string,
    data: {
      fullName?: string;
      email?: string;
      password?: string;
    },
  ) {
    const { findMemberById } = await import("@/server/models/member.model");
    const { updateUser } = await import("@/server/models/user.model");

    const member = await findMemberById(memberId);
    if (!member || member.festivalId !== festivalId) {
      throw new Error("Member not found.");
    }

    const updateData: any = {};
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.email) updateData.email = data.email;
    if (data.password) {
      updateData.password = await hash(data.password, 10);
    }

    return updateUser(member.userId, updateData);
  },

  async removeMember(festivalId: string, memberId: string) {
    const { findMemberById, deleteMember } = await import(
      "@/server/models/member.model"
    );

    const member = await findMemberById(memberId);
    if (!member || member.festivalId !== festivalId) {
      throw new Error("Member not found.");
    }

    return deleteMember(memberId);
  },
};
