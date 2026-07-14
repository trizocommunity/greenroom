"use server";

import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword } from "@/core/auth/password";
import { db } from "@/core/database/client";
import {
  festivalMember as festivalMemberTable,
  festival as festivalTable,
  user as userTable,
} from "@/core/database/schema";
import { createAuditLog } from "@/features/auth/services/audit-log.service";
import { ensureFestivalWritable } from "@/features/festivals/services/festival-context.service";

const createMemberSchema = z.object({
  festivalId: z.string(),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").toLowerCase(),
  role: z.enum(["ADMIN", "ANNOUNCER", "STAGE_MANAGER", "MEDIA"]),
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

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, festivalId),
      columns: { slug: true },
    });

    let user = await db.query.user.findFirst({
      where: eq(userTable.email, email),
    });

    const now = new Date().toISOString();

    if (!user) {
      const hashedPassword = await hashPassword(password);
      const newUserId = randomUUID();
      await db.insert(userTable).values({
        id: newUserId,
        email,
        password: hashedPassword,
        fullName,
        globalRole: "USER",
        updatedAt: now,
      });
      user = await db.query.user.findFirst({
        where: eq(userTable.id, newUserId),
      });
    }

    if (!user) throw new Error("Failed to resolve user");

    const existingMember = await db.query.festivalMember.findFirst({
      where: and(
        eq(festivalMemberTable.festivalId, festivalId),
        eq(festivalMemberTable.userId, user.id),
      ),
    });

    if (existingMember) {
      return {
        success: false,
        error: "User is already a member of this festival",
      };
    }

    await db.insert(festivalMemberTable).values({
      id: randomUUID(),
      festivalId,
      userId: user.id,
      role: role as any,
      metadata: {
        initialPassword: password,
      },
      updatedAt: now,
    });

    await createAuditLog({
      action: "CREATE_MEMBER",
      targetType: "USER",
      targetId: user.id,
      metadata: { festivalId, email, fullName, role },
    });

    if (festival?.slug) revalidatePath(`/dashboard/${festival.slug}/members`);

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
  role?: "ADMIN" | "ANNOUNCER" | "STAGE_MANAGER",
) {
  try {
    const members = await db.query.festivalMember.findMany({
      where: and(
        eq(festivalMemberTable.festivalId, festivalId),
        role ? eq(festivalMemberTable.role, role) : undefined,
      ),
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [desc(festivalMemberTable.createdAt)],
    });

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
    const memberships = await db.query.festivalMember.findMany({
      where: and(
        eq(festivalMemberTable.userId, userId),
        eq(festivalMemberTable.isActive, true),
      ),
      with: {
        festival: true,
      },
      orderBy: [desc(festivalMemberTable.createdAt)],
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
    const member = await db.query.festivalMember.findFirst({
      where: eq(festivalMemberTable.id, memberId),
      columns: { festivalId: true, userId: true },
    });
    if (!member) return { success: false, error: "Member not found" };
    await ensureFestivalWritable(member.festivalId);

    await db
      .delete(festivalMemberTable)
      .where(eq(festivalMemberTable.id, memberId));

    const festival = await db.query.festival.findFirst({
      where: eq(festivalTable.id, member.festivalId),
      columns: { slug: true },
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
