"use server";

import type { PaymentPurpose, Tier } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { TIER_CONFIG } from "@/config/pricing";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import {
  getRazorpayKeyId,
  RazorpayService,
} from "@/server/services/razorpay.service";
import { getUnusedPayment } from "@/server/services/billing.service";
import type { ActionResponse } from "@/types/actions";

export async function initiatePayment(
  purpose: PaymentPurpose,
  tier: Tier,
): Promise<ActionResponse<{ paymentId: string; orderId: string; amount: number; currency: string; key: string | undefined }>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const config = TIER_CONFIG[tier];
    if (!config) {
      throw new AppError(ERROR_MESSAGES.TIER_NOT_FOUND);
    }

    // Check for existing pending payment
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId: session.userId,
        tier,
        purpose,
        status: "PENDING",
        used: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Created within last 24 hours
        },
      },
    });

    if (existingPayment?.providerId) {
      return {
        success: true,
        data: {
          paymentId: existingPayment.id,
          orderId: existingPayment.providerId,
          amount: config.price * 100,
          currency: "INR",
          key: getRazorpayKeyId(),
        },
      };
    }

    // Create Razorpay Order (single place for Razorpay init: razorpay.service)
    const order = await RazorpayService.createOrder(
      config.price * 100,
      "INR",
      `rcpt_${Date.now()}`.substring(0, 40),
      {
        userId: session.userId,
        purpose,
        tier,
      },
    );

    // Create Payment Record (Pending)
    const payment = await prisma.payment.create({
      data: {
        amount: config.price,
        currency: "INR",
        status: "PENDING",
        providerId: order.id,
        userId: session.userId,
        purpose,
        tier,
        used: false,
      },
    });

    return {
      success: true,
      data: {
        paymentId: payment.id,
        orderId: order.id,
        amount: config.price * 100,
        currency: "INR",
        key: getRazorpayKeyId(),
      },
    };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

export async function verifyPayment(
  paymentId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<ActionResponse<null>> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND);
    }

    if (payment.status === "PAID") {
      return { success: true, data: null }; // already processed, idempotent
    }

    const isValid = RazorpayService.verifyPaymentSignature(
      payment.providerId,
      razorpayPaymentId,
      razorpaySignature,
    );
    if (!isValid) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "FAILED" },
      });
      throw new AppError(ERROR_MESSAGES.PAYMENT_SIGNATURE_INVALID);
    }

    // Update to PAID
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        referenceId: razorpayPaymentId,
      },
    });

    revalidatePath("/profile");
    return { success: true, data: null };
  } catch (error: unknown) {
    console.error("Verify Payment Error:", error);
    return handleActionError(error);
  }
}

export async function getBillingHistory() {
  const session = await getSession();
  if (!session?.userId) return [];

  return prisma.payment.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      festival: { select: { name: true } },
    },
  });
}

export async function checkUnusedCredit() {
  const session = await getSession();
  if (!session?.userId) return null;

  const payment = await getUnusedPayment(session.userId);
  return payment
    ? {
        id: payment.id,
        amount: payment.amount,
        purpose: payment.purpose,
        tier: payment.tier,
      }
    : null;
}
