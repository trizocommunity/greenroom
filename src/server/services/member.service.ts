import { hash } from "bcryptjs";
import {
  createMember,
  findMemberByFestivalAndUser,
  findMembersByFestival,
} from "@/server/models/member.model";
import { createUser, findUserByEmail } from "@/server/models/user.model";

export const MemberService = {
  async getMembers(festivalId: string) {
    return findMembersByFestival(festivalId);
  },

  async addMember(
    festivalId: string,
    data: {
      fullName: string;
      email: string;
      role: "ADMIN" | "ANNOUNCER" | "STAGE_MANAGER";
    },
  ) {
    // 1. Check if User exists
    let user = await findUserByEmail(data.email);

    if (!user) {
      // Create new User
      const hashedPassword = await hash("ChangeMe123!", 10); // temporary default
      user = await createUser({
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        displayName: data.fullName,
      });
    }

    // 2. Check if already a member of this festival
    const existingMember = await findMemberByFestivalAndUser(
      festivalId,
      user.id,
    );
    if (existingMember) {
      throw new Error("User is already a member of this festival.");
    }

    // 3. Create Member
    return createMember({
      festival: { connect: { id: festivalId } },
      user: { connect: { id: user.id } },
      role: data.role,
    });
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
