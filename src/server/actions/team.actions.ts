"use server";

import type { FestivalRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { FeatureService, getTierForFeatureCheck } from "@/lib/features";
import { createAuditLog } from "@/server/services/audit-log.service";
import { ensureFestivalWritable } from "@/server/services/festival-context.service";

const createMemberSchema = z.object({
  festivalId: z.string(),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").toLowerCase(),
  role: z.enum(["ADMIN", "ANNOUNCER", "STAGE_MANAGER"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export async function createFestivalMember(input: CreateMemberInput) {
  const result = createMemberSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { festivalId, fullName, email, role, password } = result.data;

  try {
    await ensureFestivalWritable(festivalId);

    // 0. Enforce maxTeamMembers (owner + FestivalMembers)
    const festivalForLimit = await prisma.festival.findUnique({
      where: { id: festivalId },
      select: { tier: true, slug: true },
    });
    if (festivalForLimit) {
      const maxTeamMembers =
        FeatureService.getFeatureValue<number>(
          getTierForFeatureCheck(festivalForLimit.tier),
          "maxTeamMembers",
        ) ?? 1;
      const existingCount = await prisma.festivalMember.count({
        where: { festivalId },
      });
      const totalSlots = 1 + existingCount;
      if (totalSlots >= maxTeamMembers) {
        return {
          success: false,
          error:
            "Team member limit reached for your plan. Please upgrade to add more.",
        };
      }
    }

    // 1. Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user
      const hashedPassword = await hashPassword(password);
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          globalRole: "USER",
        },
      });
    }

    // 2. Check if already a member of this festival
    const existingMember = await prisma.festivalMember.findUnique({
      where: {
        festivalId_userId: {
          festivalId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return {
        success: false,
        error: "User is already a member of this festival",
      };
    }

    // 3. Create FestivalMember
    await prisma.festivalMember.create({
      data: {
        festivalId,
        userId: user.id,
        role: role as FestivalRole,
        metadata: {
          initialPassword: password, // Storing per user request, strictly for admin initial view
        },
      },
    });

    await createAuditLog({
      action: "CREATE_MEMBER",
      targetType: "USER",
      targetId: user.id,
      metadata: { festivalId, email, fullName, role },
    });

    if (festivalForLimit?.slug)
      revalidatePath(`/dashboard/${festivalForLimit.slug}/members`);

    return { success: true };
  } catch (error) {
    console.error("Error creating member:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create member";
    return { success: false, error: message };
  }
}

export async function getFestivalMembers(
  festivalId: string,
  role?: FestivalRole,
) {
  try {
    const whereClause: import("@prisma/client").Prisma.FestivalMemberWhereInput =
      { festivalId };
    if (role) {
      whereClause.role = role;
    }

    const members = await prisma.festivalMember.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Map to flat structure
    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      fullName: m.user.fullName,
      email: m.user.email,
      role: m.role,
      status: m.isActive ? "Active" : "Disabled",
      initialPassword:
        ((m.metadata as Record<string, unknown>)?.initialPassword as
          | string
          | null) || null,
      createdAt: m.createdAt,
    }));
  } catch (error) {
    console.error("Error fetching festival members:", error);
    return [];
  }
}

export async function getJoinedFestivals(userId: string) {
  try {
    const memberships = await prisma.festivalMember.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        festival: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return memberships.map((m) => ({
      ...m.festival,
      memberRole: m.role,
      memberSince: m.createdAt,
    }));
  } catch (error) {
    console.error("Error fetching joined festivals:", error);
    return [];
  }
}

export async function revokeFestivalMember(memberId: string) {
  try {
    const member = await prisma.festivalMember.findUnique({
      where: { id: memberId },
      select: { festivalId: true, userId: true },
    });
    if (!member) return { success: false, error: "Member not found" };
    await ensureFestivalWritable(member.festivalId);

    await prisma.festivalMember.delete({
      where: { id: memberId },
    });

    const festival = await prisma.festival.findUnique({
      where: { id: member.festivalId },
      select: { slug: true },
    });
    if (festival) revalidatePath(`/dashboard/${festival.slug}/members`);

    await createAuditLog({
      action: "REVOKE_MEMBER",
      targetType: "USER",
      targetId: member.userId,
      metadata: { festivalId: member.festivalId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error revoking member:", error);
    return { success: false, error: "Failed to revoke access" };
  }
}
