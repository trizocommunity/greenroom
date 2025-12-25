"use server";

import { ActionResponse } from "@/types/actions";
import { prisma } from "@/lib/db";
import { type EditionTier, type Prisma } from "@prisma/client"; // EditionTier used as type
import { TIER_CONFIG } from "@/config/pricing";
import Razorpay from "razorpay";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function initiateEditionPayment(
  festivalId: string,
  tier: EditionTier,
  userId: string,
): Promise<ActionResponse<any>> {
  try {
    // 1. Validation
    const festival = await prisma.festival.findUnique({
      where: { id: festivalId },
      include: { editions: { where: { status: "ACTIVE" } } },
    });

    if (!festival) return { success: false, error: "Festival not found" };
    if (festival.ownerId !== userId)
      return { success: false, error: "Unauthorized" };
    if (festival.editions.length > 0)
      return { success: false, error: "An active edition already exists" };

    const config = TIER_CONFIG[tier];
    if (!config) return { success: false, error: "Invalid tier" };

    // 2. Create Razorpay Order
    const options = {
      amount: config.price * 100, // Amount in lowest denomination (paise)
      currency: "INR",
      receipt: `rcpt_${Date.now()}`.substring(0, 40),
      notes: {
        festivalId,
        tier,
        type: "EDITION_CREATION",
      },
    };

    const order = await razorpay.orders.create(options);

    // 3. Create Pending Payment Record
    const payment = await prisma.payment.create({
      data: {
        amount: config.price,
        currency: "INR",
        status: "PENDING",
        providerId: order.id,
        userId,
        festivalId,
        tier,
      },
    });

    return {
      success: true,
      data: {
        paymentId: payment.id,
        orderId: order.id,
        amount: config.price * 100,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID,
      },
    };
  } catch (error: any) {
    console.error("Payment initiation error:", error);
    return {
      success: false,
      error: error.message || "Failed to initiate payment",
    };
  }
}

export async function finalizeEditionPayment(
  paymentId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<ActionResponse<any>> {
  try {
    // 1. Fetch Payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { festival: true },
    });

    if (!payment) return { success: false, error: "Payment not found" };
    if (!payment.festivalId)
      return { success: false, error: "Payment not linked to festival" };
    if (!payment.festival)
      return { success: false, error: "Festival data not available" };

    if (payment.status === "SUCCESS")
      return { success: false, error: "Payment already processed" };

    // 2. Verify Signature
    const body = payment.providerId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "FAILED" },
      });
      return { success: false, error: "Invalid payment signature" };
    }

    // 3. Get Configuration
    const tier = payment.tier; // This acts as the source of truth
    if (!tier) return { success: false, error: "Payment has no tier" };

    const config = TIER_CONFIG[tier];
    if (!config) return { success: false, error: "Invalid tier configuration" };

    // 4. Atomic Transaction: Create Edition + Unlock Festival + Update Payment
    const nextEditionNumber =
      (await prisma.edition.count({
        where: { festivalId: payment.festivalId },
      })) + 1;

    // Ensure slug is valid
    const festivalSlug = payment.festival.slug;
    if (!festivalSlug)
      return { success: false, error: "Festival slug missing" };

    const editionSlug = `${festivalSlug}-edition-${nextEditionNumber}`;

    // Prepare data with explicit defaults to prevent DB null constraint violations
    const editionData = {
      festivalId: payment.festivalId!,
      number: nextEditionNumber, // Required by DB schema
      slug: editionSlug,
      tier: tier,
      tierLabel: config.label,
      status: "ACTIVE" as const,
      startDate: new Date(),
      endDate: new Date(Date.now() + config.durationDays * 24 * 60 * 60 * 1000),

      // Explicit constraints for potential DB mismatch (Root Cause Fix)
      description: "",
      theme: "",
      venue: "",
      location: "",
      participantsCount: 0,
      eventsCount: 0,
      judgesCount: 0,
      storageUsedMB: 0,

      createdByPaymentId: payment.id,
    };

    const limitsData = {
      maxParticipants: config.limits.participants,
      maxEvents: config.limits.events,
      maxJudges: config.limits.judges,
      maxStorageMB: config.limits.storageMB,
    };

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Create Edition with Limits (Atomic)
        const edition = await tx.edition.create({
          data: {
            ...editionData,
            limits: {
              create: limitsData,
            },
          },
        });

        // Unlock Festival
        await tx.festival.update({
          where: { id: payment.festivalId! },
          data: {
            isLocked: false,
            status: "ACTIVE",
          },
        });

        // Update Payment
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "SUCCESS",
            referenceId: razorpayPaymentId,
            editionId: edition.id,
          },
        });

        return edition;
      },
    );

    // 5. Revalidate Cache (Performance Optimization)
    revalidatePath(`/festival/${result.slug}`);
    revalidatePath(`/festival/${result.slug}/dashboard`);
    revalidatePath("/profile");
    revalidatePath("/", "layout"); // Deep invalidation

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Payment finalization error:", error);
    // Attempt to mark as failed if not already success
    try {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "FAILED" },
      });
    } catch (e) {
      /* ignore */
    }

    return {
      success: false,
      error: error.message || "Failed to finalize payment",
    };
  }
}
