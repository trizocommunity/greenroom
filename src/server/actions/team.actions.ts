"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/auth/password";
import { createAuditLog } from "@/server/services/audit-log.service";

const createTeamLeaderSchema = z.object({
  festivalId: z.string(),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type CreateTeamLeaderInput = z.infer<typeof createTeamLeaderSchema>;

export async function createTeamLeader(input: CreateTeamLeaderInput) {
  const result = createTeamLeaderSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { festivalId, fullName, email, password } = result.data;

  try {
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
    } else {
      // If user exists, we might want to ensure they don't have a conflicting role or just proceed.
      // For now, we proceed.
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
        error: "User is already a team member of this festival",
      };
    }

    // 3. Create FestivalMember
    await prisma.festivalMember.create({
      data: {
        festivalId,
        userId: user.id,
        role: "TEAM_LEADER",
        metadata: {
          initialPassword: password, // Storing per user request, strictly for admin initial view
        },
      },
    });

    await createAuditLog({
      action: "CREATE_TEAM_LEADER",
      targetType: "USER",
      targetId: user.id,
      metadata: { festivalId, email, fullName },
    });

    revalidatePath(`/festival/${festivalId}/teams`);
    return { success: true };
  } catch (error) {
    console.error("Error creating team leader:", error);
    return { success: false, error: "Failed to create team leader" };
  }
}

export async function getTeamLeaders(festivalId: string) {
  try {
    const members = await prisma.festivalMember.findMany({
      where: {
        festivalId,
        role: "TEAM_LEADER",
      },
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
      status: m.isActive ? "Active" : "Disabled",
      initialPassword: (m.metadata as any)?.initialPassword || null,
      createdAt: m.createdAt,
    }));
  } catch (error) {
    console.error("Error fetching team leaders:", error);
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

export async function revokeTeamLeader(memberId: string) {
  try {
    const member = await prisma.festivalMember.findUnique({
      where: { id: memberId },
      select: { festivalId: true, userId: true },
    });
    if (!member) return { success: false, error: "Member not found" };

    await prisma.festivalMember.delete({
      where: { id: memberId },
    });
    revalidatePath(`/festival/${member.festivalId}/teams`);

    await createAuditLog({
      action: "REVOKE_TEAM_LEADER",
      targetType: "USER",
      targetId: member.userId,
      metadata: { festivalId: member.festivalId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error revoking team leader:", error);
    return { success: false, error: "Failed to revoke access" };
  }
}
