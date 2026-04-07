import type { PaymentPurpose, PaymentStatus, Tier } from "@prisma/client";
import { TIER_CONFIG } from "@/config/pricing";
import { prisma } from "@/lib/db";
import {
  getActivePaymentForUser,
  getLatestPaymentForUser,
  getPaymentByOrderId,
  updatePaymentStatus,
} from "@/server/models/payment.model";
import {
  getRazorpayKeyId,
  RazorpayService,
} from "@/server/services/razorpay.service";

type InitiatePaymentParams = {
  userId: string;
  purpose: PaymentPurpose;
  tier: Tier;
};

type InitiatePaymentResult = {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  key: string | undefined;
};

export async function initiatePaymentDomain(
  params: InitiatePaymentParams,
): Promise<InitiatePaymentResult> {
  const { userId, purpose, tier } = params;
  const config = TIER_CONFIG[tier];

  if (!config) {
    throw new Error("Tier configuration not found");
  }

  const existingPayment = await prisma.payment.findFirst({
    where: {
      userId,
      tier,
      purpose,
      status: "PENDING",
      used: false,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  if (existingPayment?.providerId) {
    return {
      paymentId: existingPayment.id,
      orderId: existingPayment.providerId,
      amount: config.price * 100,
      currency: "INR",
      key: getRazorpayKeyId(),
    };
  }

  const order = await RazorpayService.createOrder(
    config.price * 100,
    "INR",
    `rcpt_${Date.now()}`.substring(0, 40),
    {
      userId,
      purpose,
      tier,
    },
  );

  const payment = await prisma.payment.create({
    data: {
      amount: config.price,
      currency: "INR",
      status: "PENDING",
      providerId: order.id,
      userId,
      purpose,
      tier,
      used: false,
    },
  });

  return {
    paymentId: payment.id,
    orderId: order.id,
    amount: config.price * 100,
    currency: "INR",
    key: getRazorpayKeyId(),
  };
}

export async function verifyPaymentDomain(
  paymentId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<PaymentStatus> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.status === "PAID") {
    return payment.status;
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
    throw new Error("Invalid payment signature");
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "PAID",
      referenceId: razorpayPaymentId,
    },
  });

  await prisma.payment.updateMany({
    where: {
      userId: updated.userId,
      status: "PENDING",
      purpose: updated.purpose,
      id: { not: updated.id },
    },
    data: {
      status: "FAILED",
    },
  });

  // Update analytics summary for this user (Phase 5)
  await prisma.userPurchaseSummary.upsert({
    where: { userId: updated.userId },
    update: {
      totalSpend: { increment: updated.amount },
      festivalsCount: { increment: 1 },
      lastPurchaseAt: updated.createdAt,
    },
    create: {
      userId: updated.userId,
      totalSpend: updated.amount,
      festivalsCount: 1,
      lastPurchaseAt: updated.createdAt,
      festivalIds: [],
      planCountsByTier: {},
    },
  });

  return updated.status;
}

export async function verifyPaymentByOrderIdDomain(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<boolean> {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    payload;

  const isValid = RazorpayService.verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  );

  if (!isValid) {
    throw new Error("Invalid payment signature");
  }

  const payment = await getPaymentByOrderId(razorpay_order_id);
  if (!payment) {
    throw new Error("Payment record not found");
  }

  await updatePaymentStatus(payment.id, "PAID", razorpay_payment_id);

  return true;
}

export async function getUserPaymentsDomain(userId: string) {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserStatusDomain(userId: string, role: string) {
  const activePayment = await getActivePaymentForUser(userId);

  let hasExistingFestival = false;
  if (role === "USER") {
    const { findAllFestivals } = await import("@/server/models/festival.model");
    const userFestivals = await findAllFestivals({ ownerId: userId });
    hasExistingFestival = userFestivals.length > 0;
  }

  if (activePayment) {
    return {
      status: "ACTIVE",
      payment: {
        ...activePayment,
        validFrom: activePayment.createdAt,
      },
      canCreateFestival: !hasExistingFestival,
    };
  }

  const latestPayment = await getLatestPaymentForUser(userId);

  if (latestPayment && latestPayment.status === "PAID") {
    return {
      status: "EXPIRED",
      payment: {
        ...latestPayment,
        validFrom: latestPayment.createdAt,
      },
      canCreateFestival: false,
    };
  }

  return {
    status: "NOT_PAID",
    payment: null,
    canCreateFestival: false,
  };
}
