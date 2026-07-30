"use server";

import { randomUUID } from "crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { TIER_CONFIG } from "@/config/pricing";
import { getSession } from "@/core/auth/session";
import { db } from "@/core/database/client";
import { payment as paymentTable } from "@/core/database/schema";
import {
  AppError,
  ERROR_MESSAGES,
  handleActionError,
} from "@/core/errors/errors";
import type { ActionResponse } from "@/core/types/actions";
import { getUnusedPayment } from "@/features/billing/services/billing.service";
import {
  getRazorpayKeyId,
  RazorpayService,
} from "@/features/payments/services/razorpay.service";

export async function initiatePayment(
  purpose: "FESTIVAL_CREATION",
  tier: "BASIC" | "STANDARD" | "PRO",
): Promise<
  ActionResponse<{
    paymentId: string;
    orderId: string;
    amount: number;
    currency: string;
    key: string | undefined;
  }>
> {
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
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const existingPayment = await db.query.payment.findFirst({
      where: and(
        eq(paymentTable.userId, session.userId),
        eq(paymentTable.tier, tier),
        eq(paymentTable.purpose, purpose),
        eq(paymentTable.status, "PENDING"),
        eq(paymentTable.used, false),
        gte(paymentTable.createdAt, yesterday),
      ),
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

    // Create Razorpay Order
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
    const now = new Date();

    const paymentId = randomUUID();
    await db.insert(paymentTable).values({
      id: paymentId,
      amount: config.price,
      currency: "INR",
      status: "PENDING",
      providerId: order.id,
      userId: session.userId,
      purpose,
      tier,
      used: false,
      updatedAt: now.toISOString(),
    });

    return {
      success: true,
      data: {
        paymentId,
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
    const payment = await db.query.payment.findFirst({
      where: eq(paymentTable.id, paymentId),
    });

    if (!payment) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND);
    }

    if (payment.status === "PAID") {
      return { success: true, data: null };
    }

    const isValid = RazorpayService.verifyPaymentSignature(
      payment.providerId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (!isValid) {
      await db
        .update(paymentTable)
        .set({
          status: "FAILED",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(paymentTable.id, paymentId));
      throw new AppError(ERROR_MESSAGES.PAYMENT_SIGNATURE_INVALID);
    }

    // Update to PAID — atomic update prevents TOCTOU race
    const updated = await db
      .update(paymentTable)
      .set({
        status: "PAID",
        referenceId: razorpayPaymentId,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(eq(paymentTable.id, paymentId), eq(paymentTable.status, "PENDING")),
      )
      .returning();

    if (updated.length === 0) {
      throw new AppError("Payment already processed or invalid state");
    }

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

  return db.query.payment.findMany({
    where: eq(paymentTable.userId, session.userId),
    orderBy: [desc(paymentTable.createdAt)],
    with: {
      festival: { columns: { name: true } },
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
        validFrom: payment.createdAt,
      }
    : null;
}
