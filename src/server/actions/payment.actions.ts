"use server";

import type { Prisma, Tier } from "@prisma/client";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import Razorpay from "razorpay";
import { TIER_CONFIG } from "@/config/pricing";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError, ERROR_MESSAGES, handleActionError } from "@/lib/errors";
import { createAuditLog } from "@/server/services/audit-log.service";
import type { ActionResponse } from "@/types/actions";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function initiateFestivalPayment(
  tier: Tier,
): Promise<ActionResponse<{ paymentId: string; orderId: string; amount: number; currency: string; key: string | undefined }>> {
  try {
    const session = await getSession();
    if (!session?.userId) throw new AppError(ERROR_MESSAGES.UNAUTHORIZED);
    const userId = session.userId;

    const config = TIER_CONFIG[tier];
    if (!config) throw new AppError(ERROR_MESSAGES.TIER_NOT_FOUND);

    // Check for existing pending payment
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        tier,
        status: "PENDING",
        used: false,
        purpose: "FESTIVAL_CREATION",
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
          key: process.env.RAZORPAY_KEY_ID,
        },
      };
    }

    // Create Razorpay Order
    const options = {
      amount: config.price * 100,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`.substring(0, 40),
      notes: {
        userId,
        tier,
        type: "FESTIVAL_CREATION",
      },
    };

    const order = await razorpay.orders.create(options);

    // Create Pending Payment Record
    const payment = await prisma.payment.create({
      data: {
        amount: config.price,
        currency: "INR",
        status: "PENDING",
        providerId: order.id,
        userId,
        tier,
        purpose: "FESTIVAL_CREATION",
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
        key: process.env.RAZORPAY_KEY_ID,
      },
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function verifyFestivalPayment(
  paymentId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<ActionResponse<{ paymentId: string }>> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new AppError(ERROR_MESSAGES.NOT_FOUND);
    if (payment.status === "PAID")
      throw new AppError(ERROR_MESSAGES.PAYMENT_ALREADY_PROCESSED);

    // Verify Signature
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

      await createAuditLog({
        action: "PAYMENT_FAILED",
        targetType: "PAYMENT",
        targetId: paymentId,
        metadata: { reason: "Invalid signature" },
      });

      throw new AppError(ERROR_MESSAGES.PAYMENT_SIGNATURE_INVALID);
    }

    // Mark as PAID
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        referenceId: razorpayPaymentId,
      },
    });

    await createAuditLog({
      action: "PAYMENT_SUCCESS",
      targetType: "PAYMENT",
      targetId: paymentId,
      metadata: {
        amount: payment.amount,
        tier: payment.tier,
        providerId: payment.providerId,
      },
    });

    // Clean up other abandoned pending payments for festival creation
    await prisma.payment.updateMany({
      where: {
        userId: payment.userId,
        status: "PENDING",
        purpose: "FESTIVAL_CREATION",
        id: { not: paymentId }, // Exclude the current successfully paid one
      },
      data: {
        status: "FAILED",
      },
    });

    revalidatePath("/profile");
    return { success: true, data: { paymentId } };
  } catch (error) {
    return handleActionError(error);
  }
}
