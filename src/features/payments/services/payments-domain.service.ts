import { and, eq, gte, ne, sql } from "drizzle-orm";
import { TIER_CONFIG } from "@/config/pricing";
import { db } from "@/core/database/client";
import { generateId } from "@/core/database/ids";
import { payment, userPurchaseSummary } from "@/core/database/schema";
import { isExpired } from "@/core/datetime";
import {
  fromNow,
  MS,
  serverNowIso,
  serverNowMs,
} from "@/core/datetime/server";
import {
  getActivePaymentForUser,
  getLatestPaymentForUser,
  getPaymentByOrderId,
  updatePaymentStatus,
} from "@/features/payments/repositories/payment.repository";
import {
  getRazorpayKeyId,
  RazorpayService,
} from "@/features/payments/services/razorpay.service";

type PaymentPurpose = "FESTIVAL_CREATION";
type PaymentStatus = "PENDING" | "PAID" | "FAILED";
type Tier = "BASIC" | "STANDARD" | "PRO";

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

  const existingPayment = await db.query.payment.findFirst({
    where: and(
      eq(payment.userId, userId),
      eq(payment.tier, tier),
      eq(payment.purpose, purpose),
      eq(payment.status, "PENDING"),
      eq(payment.used, false),
      gte(payment.createdAt, fromNow(-MS.day)),
    ),
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
    `rcpt_${serverNowMs()}`.substring(0, 40),
    { userId, purpose, tier },
  );

  const validUntil = fromNow(config.festivalDurationDays * MS.day);

  const newPayment = await db
    .insert(payment)
    .values({
      id: generateId(),
      amount: config.price,
      currency: "INR",
      status: "PENDING",
      providerId: order.id,
      userId,
      purpose,
      tier,
      used: false,
      validUntil,
      updatedAt: serverNowIso(),
    })
    .returning();

  return {
    paymentId: newPayment[0].id,
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
  const paymentRecord = await db.query.payment.findFirst({
    where: eq(payment.id, paymentId),
  });

  if (!paymentRecord) {
    throw new Error("Payment not found");
  }

  if (paymentRecord.status === "PAID") {
    return paymentRecord.status;
  }

  const isValid = RazorpayService.verifyPaymentSignature(
    paymentRecord.providerId ?? "",
    razorpayPaymentId,
    razorpaySignature,
  );

  if (!isValid) {
    await db
      .update(payment)
      .set({ status: "FAILED" })
      .where(eq(payment.id, paymentId));
    throw new Error("Invalid payment signature");
  }

  const updated = await db
    .update(payment)
    .set({
      status: "PAID",
      referenceId: razorpayPaymentId,
    })
    .where(and(eq(payment.id, paymentId), eq(payment.status, "PENDING")))
    .returning();

  if (updated.length === 0) {
    throw new Error("Payment already processed");
  }

  const updatedPayment = updated[0];

  // Cancel other pending payments for same user/purpose
  await db
    .update(payment)
    .set({ status: "FAILED" })
    .where(
      and(
        eq(payment.userId, updatedPayment.userId),
        eq(payment.status, "PENDING"),
        eq(payment.purpose, updatedPayment.purpose ?? "FESTIVAL_CREATION"),
        ne(payment.id, updatedPayment.id),
      ),
    );

  // Update analytics summary for this user
  await db
    .insert(userPurchaseSummary)
    .values({
      userId: updatedPayment.userId,
      totalSpend: updatedPayment.amount,
      festivalsCount: 1,
      lastPurchaseAt: updatedPayment.createdAt,
      updatedAt: updatedPayment.createdAt,
      festivalIds: [],
      planCountsByTier: {},
    })
    .onConflictDoUpdate({
      target: userPurchaseSummary.userId,
      set: {
        totalSpend: sql`${userPurchaseSummary.totalSpend} + ${updatedPayment.amount}`,
        festivalsCount: sql`${userPurchaseSummary.festivalsCount} + 1`,
        lastPurchaseAt: updatedPayment.createdAt,
      },
    });

  return updatedPayment.status;
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

  const paymentRecord = await getPaymentByOrderId(razorpay_order_id);
  if (!paymentRecord) {
    throw new Error("Payment record not found");
  }

  await updatePaymentStatus(paymentRecord.id, "PAID", razorpay_payment_id);

  return true;
}

export async function getUserPaymentsDomain(userId: string) {
  return db.query.payment.findMany({
    where: eq(payment.userId, userId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export async function getUserStatusDomain(userId: string, role: string) {
  const activePayment = await getActivePaymentForUser(userId);

  let hasExistingFestival = false;
  if (role === "USER") {
    const { findFestivalByOwnerId } = await import(
      "@/features/festivals/repositories/festival.repository"
    );
    const fest = await findFestivalByOwnerId(userId);
    hasExistingFestival = !!fest;
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
    const expired = isExpired(latestPayment.validUntil);

    return {
      status: expired ? "EXPIRED" : "ACTIVE",
      payment: {
        ...latestPayment,
        validFrom: latestPayment.createdAt,
      },
      canCreateFestival: !expired && !hasExistingFestival,
    };
  }

  return {
    status: "NOT_PAID",
    payment: null,
    canCreateFestival: false,
  };
}
