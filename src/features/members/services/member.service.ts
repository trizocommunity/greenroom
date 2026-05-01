import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
import { forgotPasswordAction } from "@/features/auth/actions/auth.actions";
import {
  createUser,
  findUserByEmail,
} from "@/features/auth/repositories/user.repository";
import { findFestivalById } from "@/features/festivals/repositories/festival.repository";
import { ensureFestivalWritable } from "@/features/festivals/services/festival-context.service";
import {
  createMember,
  deleteMember,
  findMemberByFestivalAndUser,
  findMemberById,
  findMembersByFestival,
} from "@/features/members/repositories/member.repository";
import {
  FeatureService,
  getTierForFeatureCheck,
} from "@/features/plan-features/services/features";

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

    // 0. Enforce maxTeamMembers (owner + FestivalMembers)
    const festival = await findFestivalById(festivalId);
    if (festival) {
      const maxTeamMembers =
        FeatureService.getFeatureValue<number>(
          getTierForFeatureCheck(festival.tier),
          "maxTeamMembers",
        ) ?? 1;
      const existingMembers = await findMembersByFestival(festivalId);
      const totalSlots = 1 + existingMembers.length; // owner counts as 1
      if (totalSlots >= maxTeamMembers) {
        throw new AppError(ERROR_MESSAGES.MEMBER_LIMIT_REACHED);
      }
    }

    // 1. Check if User exists
    let user = await findUserByEmail(data.email);
    let isNewUser = false;

    if (!user) {
      // Create new User with a random unusable password (SEC-6 fix: we trigger reset below)
      const { hash } = await import("bcryptjs");
      const randomPassword = `${crypto.randomUUID()}-${Date.now()}`;
      const hashedPassword = await hash(randomPassword, 10);
      user = await createUser({
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        displayName: data.fullName,
      });
      isNewUser = true;
    }

    // 2. Check if already a member of this festival
    const existingMember = await findMemberByFestivalAndUser(
      festivalId,
      user.id,
    );
    if (existingMember) {
      throw new AppError(ERROR_MESSAGES.MEMBER_ALREADY_EXISTS);
    }

    // 3. Create Member
    const member = await createMember({
      festivalId,
      userId: user.id,
      role: data.role,
    });

    // 4. SEC-6: If a new account was created, send a password-set email via the forgot-password flow
    if (isNewUser) {
      await forgotPasswordAction({ email: data.email }).catch(() => {
        // Non-fatal: member is created regardless; they can request a reset manually
      });
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
