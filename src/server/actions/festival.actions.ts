"use server";

import { revalidatePath } from "next/cache";
import { TIER_CONFIG } from "@/config/pricing";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";

import {
  type CreateFestivalInput,
  createFestivalSchema,
} from "@/lib/validations/festival";
import { createAuditLog } from "@/server/services/audit-log.service";

export async function createFestival(input: CreateFestivalInput) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // 1. Validate Input
    const data = createFestivalSchema.parse(input);

    // 2. Validate Payment
    const payment = await prisma.payment.findUnique({
      where: { id: data.paymentId, userId: session.userId },
    });

    if (!payment || payment.status !== "PAID" || payment.used) {
      throw new AppError("Invalid, unpaid, or used payment.");
    }

    // Payment Purpose Check
    if (payment.purpose !== "FESTIVAL_CREATION") {
      throw new AppError("Payment purpose mismatch.");
    }

    // Resolve Tier (Default to STANDARD if missing)
    const tier = payment.tier || "STANDARD";
    const tierConfig = TIER_CONFIG[tier];

    // 3. Atomic Transaction
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (tierConfig.durationDays || 40));

    const result = await prisma.$transaction(async (tx) => {
      // Create Festival
      const finalSlug = (
        data.festivalSlug ||
        data.festivalName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      ).slice(0, 50);

      const festival = await tx.festival.create({
        data: {
          name: data.festivalName,
          slug: finalSlug,
          institutionType: data.institutionType || "OTHER",
          institutionName: data.institutionName,
          location: data.location,
          description: data.description,
          ownerId: session.userId,
          status: "ACTIVE",
          expiresAt: expiresAt,
          isLocked: false,

          // Create Admin Member
          members: {
            create: {
              userId: session.userId,
              role: "ADMIN",
            },
          },

          // Tier Info
          tier: tier,
          tierLabel: tierConfig?.label || "Standard",
        },
      });

      // Mark Payment Used
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          used: true,
          festivalId: festival.id,
        },
      });

      return festival;
    });

    await createAuditLog({
      action: "CREATE_FESTIVAL",
      targetType: "FESTIVAL",
      targetId: result.id,
      metadata: { name: result.name, tier: result.tier },
    });

    revalidatePath("/profile");
    revalidatePath("/festivals");

    return { success: true, data: result };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateFestivalDeadlinesAction(
  festivalId: string,
  data: {
    programmeAssignmentDeadline?: string | null;
  },
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Check ADMIN
    const festival = await prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        members: {
          where: {
            userId: session.userId,
            role: "ADMIN",
          },
        },
      },
    });

    const isAdmin = festival?.members.length && festival.members.length > 0;
    const isOwner = festival?.ownerId === session.userId;
    const isSuperAdmin = session.role === "SUPER_ADMIN";

    if (!festival || (!isAdmin && !isOwner && !isSuperAdmin)) {
      throw new AppError(ERROR_MESSAGES.FORBIDDEN);
    }

    const updated = await prisma.festival.update({
      where: { id: festivalId },
      data: {
        programmeAssignmentDeadline: data.programmeAssignmentDeadline
          ? new Date(data.programmeAssignmentDeadline)
          : null,
      },
    });

    revalidatePath(`/festival/${festival.slug}/settings`);
    return { success: true, data: updated };
  } catch (error) {
    return handleActionError(error);
  }
}
