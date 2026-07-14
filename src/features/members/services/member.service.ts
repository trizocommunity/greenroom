import { createMagicLinkToken } from "@/core/auth/magic-link";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { sendMagicLinkEmail } from "@/core/integrations/email";
import {
  createUser,
  findUserByEmail,
} from "@/features/auth/repositories/user.repository";
import { ensureFestivalWritable } from "@/features/festivals/services/festival-context.service";
import {
  createMember,
  deleteMember,
  findMemberByFestivalAndUser,
  findMemberById,
  findMembersByFestival,
} from "@/features/members/repositories/member.repository";

const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000;

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
    await ensureFestivalWritable(festivalId);

    let user = await findUserByEmail(data.email);
    let isNewUser = false;

    if (!user) {
      user = await createUser({
        email: data.email,
        fullName: data.fullName,
        displayName: data.fullName,
      });
      isNewUser = true;
    }

    const existingMember = await findMemberByFestivalAndUser(
      festivalId,
      user.id,
    );
    if (existingMember) {
      throw new AppError(ERROR_MESSAGES.MEMBER_ALREADY_EXISTS);
    }

    const member = await createMember({
      festivalId,
      userId: user.id,
      role: data.role,
    });

    if (isNewUser) {
      const token = await createMagicLinkToken(
        data.email,
        MAGIC_LINK_EXPIRY_MS,
      );
      await sendMagicLinkEmail(data.email, token).catch(() => {});
    }

    return member;
  },

  async removeMember(festivalId: string, memberId: string) {
    const member = await findMemberById(memberId);
    if (!member || member.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }

    return deleteMember(memberId);
  },
};
