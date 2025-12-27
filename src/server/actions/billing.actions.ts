"use server";

import type { PaymentPurpose, Tier } from "@prisma/client";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import Razorpay from "razorpay";
import { TIER_CONFIG } from "@/config/pricing";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getUnusedPayment } from "@/server/services/billing.service";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function initiatePayment(purpose: PaymentPurpose, tier: Tier) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Unauthorized" };
    }

    const config = TIER_CONFIG[tier];
    if (!config) {
      return { success: false, error: "Invalid tier" };
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
          key: process.env.RAZORPAY_KEY_ID,
        },
      };
    }

    // Create Razorpay Order
    const options = {
      amount: config.price * 100, // Amount in paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`.substring(0, 40),
      notes: {
        userId: session.userId,
        purpose,
        tier,
      },
    };

    const order = await razorpay.orders.create(options);

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
        amount: options.amount,
        currency: options.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    };
  } catch (error: any) {
    console.error("Initiate Payment Error:", error);
    return {
      success: false,
      error: error.message || "Failed to initiate payment",
    };
  }
}

export async function verifyPayment(
  paymentId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    if (payment.status === "PAID") {
      return { success: true, message: "Already paid" };
    }

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
      return { success: false, error: "Invalid signature" };
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
    return { success: true };
  } catch (error: any) {
    console.error("Verify Payment Error:", error);
    return { success: false, error: error.message || "Verification failed" };
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
