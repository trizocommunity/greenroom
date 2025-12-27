"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TIER_CONFIG } from "@/config/pricing";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  consumePayment,
  getUnusedPayment,
} from "@/server/services/billing.service";
import { createAuditLog } from "@/server/services/audit-log.service";

// Validation Schema

import { InstitutionType } from "@prisma/client";

import {
  createFestivalSchema,
  type CreateFestivalInput,
} from "@/lib/validations/festival";

export async function createFestival(input: CreateFestivalInput) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Validate Input
    const data = createFestivalSchema.parse(input);

    // 2. Validate Payment
    const payment = await prisma.payment.findUnique({
      where: { id: data.paymentId, userId: session.userId },
    });

    if (!payment || payment.status !== "PAID" || payment.used) {
      return { success: false, error: "Invalid, unpaid, or used payment." };
    }

    // Payment Purpose Check
    if (payment.purpose !== "FESTIVAL_CREATION") {
      return { success: false, error: "Payment purpose mismatch." };
    }

    // Resolve Tier (Default to STANDARD if missing)
    const tier = payment.tier || "STANDARD";
    const tierConfig = TIER_CONFIG[tier];

    // 3. Atomic Transaction
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 40); // 40 Days hard coded

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
          status: "ACTIVE",
          expiresAt: expiresAt,
          isLocked: false,
          ownerId: session.userId,

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
  } catch (error: any) {
    console.error("Create Festival Error:", error);
    if (error.code === "P2002") {
      return { success: false, error: "Slug taken." };
    }
    return { success: false, error: error.message || "Failed." };
  }
}
