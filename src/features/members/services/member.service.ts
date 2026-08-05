import { headers } from "next/headers";
import { AppError, ERROR_MESSAGES } from "@/core/errors/errors";
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
  updateMemberRoles,
} from "@/features/members/repositories/member.repository";
import { auth } from "@/core/auth/better-auth/auth";

export const MemberService = {
  async getMembers(festivalId: string) {
    return findMembersByFestival(festivalId);
  },

  async addMember(
    festivalId: string,
    data: {
      fullName: string;
      email: string;
      role: "ADMIN" | "ANNOUNCER" | "STAGE_MANAGER" | "MEDIA";
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
      // Send a magic link so the new member can sign in. Better Auth's
      // `sendMagicLink` hook (`core/auth/better-auth/auth.ts`) sends the
      // existing `sendMagicLinkEmail` — no email-send code here.
      const hdrs = await headers();
      await auth.api
        .signInMagicLink({
          body: { email: data.email, callbackURL: "/profile" },
          headers: hdrs,
          asResponse: false,
        })
        .catch((err) => {
          console.error("[member.add] signInMagicLink failed", err);
        });
    }

    return member;
  },

  async updateMemberRoles(
    festivalId: string,
    memberId: string,
    roles: string[],
  ) {
    await ensureFestivalWritable(festivalId);

    const member = await findMemberById(memberId);
    if (!member || member.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }

    if (roles.length === 0) {
      throw new AppError("At least one role is required");
    }

    const validRoles = ["ADMIN", "ANNOUNCER", "STAGE_MANAGER", "MEDIA"];
    for (const r of roles) {
      if (!validRoles.includes(r)) {
        throw new AppError(`Invalid role: ${r}`);
      }
    }

    const [primaryRole, ...additionalRoles] = roles;
    return updateMemberRoles(memberId, primaryRole, additionalRoles);
  },

  async removeMember(festivalId: string, memberId: string) {
    const member = await findMemberById(memberId);
    if (!member || member.festivalId !== festivalId) {
      throw new AppError(ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }

    return deleteMember(memberId);
  },
};
