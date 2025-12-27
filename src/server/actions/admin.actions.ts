"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma as db } from "@/lib/db";

// Helper to enforce Super Admin role
async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Super Admin access required");
  }
  return session;
}

// --- Festival Management ---

export async function deleteFestivalAdmin(festivalId: string, reason: string) {
  const admin = await requireSuperAdmin();

  const festival = await db.festival.findUnique({
    where: { id: festivalId },
    select: { name: true },
  });

  if (!festival) {
    throw new Error("Festival not found");
  }

  await db.$transaction(async (tx) => {
    // 1. Delete related child entities (cascade should handle most, but be explicit)
    await tx.programmeAssignment.deleteMany({ where: { festivalId } });
    await tx.participant.deleteMany({ where: { festivalId } });
    await tx.programme.deleteMany({ where: { festivalId } });
    await tx.group.deleteMany({ where: { festivalId } });
    await tx.category.deleteMany({ where: { festivalId } });

    // 2. Delete Payments (set null would be fine too if we want to keep payment history)
    await tx.payment.deleteMany({ where: { festivalId } });

    // 3. Delete Festival
    await tx.festival.delete({ where: { id: festivalId } });

    // 4. Log Audit
    await tx.auditLog.create({
      data: {
        actorId: admin.userId,
        actorRole: "SUPER_ADMIN",
        action: "DELETE_FESTIVAL",
        targetType: "FESTIVAL",
        targetId: festivalId,
        metadata: { reason, festivalName: festival.name },
      },
    });
  });

  revalidatePath("/super-admin/festivals");
  return { success: true };
}

export async function freezeFestivalAdmin(festivalId: string, reason: string) {
  const admin = await requireSuperAdmin();

  const festival = await db.festival.findUnique({
    where: { id: festivalId },
  });

  if (!festival) {
    throw new Error("Festival not found");
  }

  await db.$transaction(async (tx) => {
    await tx.festival.update({
      where: { id: festivalId },
      data: { isLocked: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.userId,
        actorRole: "SUPER_ADMIN",
        action: "FREEZE_FESTIVAL",
        targetType: "FESTIVAL",
        targetId: festivalId,
        metadata: { reason, festivalName: festival.name },
      },
    });
  });

  revalidatePath("/super-admin/festivals");
  return { success: true };
}

// --- Fetch Actions ---

export async function getFestivalAdmin(festivalId: string) {
  await requireSuperAdmin();
  const festival = await db.festival.findUnique({
    where: { id: festivalId },
  });
  return festival;
}
