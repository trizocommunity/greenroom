"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { 
  festival as festivalTable, 
  programmeAssignment as assignmentTable,
  student as studentTable,
  programme as programmeTable,
  group as groupTable,
  category as categoryTable,
  payment as paymentTable,
  auditLog as auditLogTable
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import { randomUUID } from "crypto";

// Helper to enforce Super Admin role
async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    throw new AppError(ERROR_MESSAGES.FORBIDDEN);
  }
  return session;
}

// --- Festival Management ---

export async function deleteFestivalAdmin(festivalId: string, reason: string) {
  const admin = await requireSuperAdmin();

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
    columns: { name: true },
  });

  if (!festival) {
    throw new AppError(ERROR_MESSAGES.NOT_FOUND);
  }

  await db.transaction(async (tx) => {
    // 1. Delete related child entities
    await tx.delete(assignmentTable).where(eq(assignmentTable.festivalId, festivalId));
    await tx.delete(studentTable).where(eq(studentTable.festivalId, festivalId));
    await tx.delete(programmeTable).where(eq(programmeTable.festivalId, festivalId));
    await tx.delete(groupTable).where(eq(groupTable.festivalId, festivalId));
    await tx.delete(categoryTable).where(eq(categoryTable.festivalId, festivalId));

    // 2. Delete Payments
    await tx.delete(paymentTable).where(eq(paymentTable.festivalId, festivalId));

    // 3. Delete Festival
    await tx.delete(festivalTable).where(eq(festivalTable.id, festivalId));

    // 4. Log Audit
    await tx.insert(auditLogTable).values({
      id: randomUUID(),
      actorId: admin.userId,
      actorRole: "SUPER_ADMIN",
      action: "DELETE_FESTIVAL",
      targetType: "FESTIVAL",
      targetId: festivalId,
      metadata: { reason, festivalName: festival.name },
      updatedAt: new Date().toISOString(),
    });
  });

  revalidatePath("/super-admin/festivals");
  return { success: true };
}

export async function updateFestivalAdmin(
  festivalId: string,
  data: any,
) {
  const admin = await requireSuperAdmin();

  try {
    const updatedFestivals = await db.update(festivalTable).set({
      ...data,
      updatedAt: new Date().toISOString(),
    }).where(eq(festivalTable.id, festivalId)).returning();

    const festival = updatedFestivals[0];

    await db.insert(auditLogTable).values({
      id: randomUUID(),
      actorId: admin.userId,
      actorRole: "SUPER_ADMIN",
      action: "UPDATE_FESTIVAL",
      targetType: "FESTIVAL",
      targetId: festivalId,
      metadata: { changes: Object.keys(data) },
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/super-admin/festivals");
    return { success: true, data: festival };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

export async function freezeFestivalAdmin(festivalId: string, reason: string) {
  const admin = await requireSuperAdmin();

  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
  });

  if (!festival) {
    throw new AppError(ERROR_MESSAGES.NOT_FOUND);
  }

  await db.transaction(async (tx) => {
    await tx.update(festivalTable).set({ 
      isLocked: true,
      updatedAt: new Date().toISOString(),
    }).where(eq(festivalTable.id, festivalId));

    await tx.insert(auditLogTable).values({
      id: randomUUID(),
      actorId: admin.userId,
      actorRole: "SUPER_ADMIN",
      action: "FREEZE_FESTIVAL",
      targetType: "FESTIVAL",
      targetId: festivalId,
      metadata: { reason, festivalName: festival.name },
      updatedAt: new Date().toISOString(),
    });
  });

  revalidatePath("/super-admin/festivals");
  return { success: true };
}

// --- Fetch Actions ---

export async function getFestivalAdmin(festivalId: string) {
  await requireSuperAdmin();
  const festival = await db.query.festival.findFirst({
    where: eq(festivalTable.id, festivalId),
  });
  return festival;
}
