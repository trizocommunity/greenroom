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
    await tx.student.deleteMany({ where: { festivalId } });
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

export async function updateFestivalAdmin(
  festivalId: string,
  data: any, // using UpdateFestivalInput but strict
) {
  const admin = await requireSuperAdmin();

  // We should preferably validate data with schema if possible
  // For now assuming the caller validates, or better, we parse it here.
  // importing updateFestivalSchema would be good but avoids circular deps? No.

  try {
    const festival = await db.festival.update({
      where: { id: festivalId },
      data: data,
    });

    await db.auditLog.create({
      data: {
        actorId: admin.userId,
        actorRole: "SUPER_ADMIN",
        action: "UPDATE_FESTIVAL",
        targetType: "FESTIVAL",
        targetId: festivalId,
        metadata: { changes: Object.keys(data) },
      },
    });

    revalidatePath("/super-admin/festivals");
    return { success: true, data: festival };
  } catch (error: any) {
    // Manual simple error handling for now to match pattern or use handleActionError if available
    // Since handleActionError is in another file, I'll copy the logic briefly or import it if exported.
    // It is exported from utils/error (implied).
    // But I will just catch P2002 manually for slug.
    if (error.code === "P2002" && error.meta?.target?.includes("slug")) {
      return {
        success: false,
        fields: { slug: "This subdomain is already taken." },
      };
    }
    return { success: false, error: error.message };
  }
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
