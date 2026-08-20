import { and, eq, ne, sql } from "drizzle-orm";
import { TIER_CONFIG } from "@/config/pricing";
import { db } from "@/core/database/client";
import { generateId } from "@/core/database/ids";
import { payment, userPurchaseSummary } from "@/core/database/schema";
import { isExpired } from "@/core/datetime";
import { fromNow, MS, serverNowIso, serverNowMs } from "@/core/datetime/server";
import { publish } from "@/core/pubsub/redis-pubsub";
import { keys } from "@/core/redis/keys";
import {
  getActivePaymentForUser,
  getLatestPaymentForUser,
  getPaymentByOrderId,
  updatePaymentStatus,
} from "@/features/payments/repositories/payment.repository";
import {
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

export type InitiatePaymentSuccess = {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
};

export type PendingOrderExists = {
  outcome: "pendingExists";
  paymentId: string;
  orderId: string;
  tier: Tier;
};

export type InitiatePaymentResult =
  | InitiatePaymentSuccess
  | PendingOrderExists;

export class PendingOrderExistsError extends Error {
  readonly code = "PENDING_ORDER_EXISTS" as const;
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string | null,
    public readonly tier: Tier,
  ) {
    super(
      `A pending order already exists for tier ${tier}. Complete or cancel it before starting a new one.`,
    );
    this.name = "PendingOrderExistsError";
  }
}

/**
 * Postgres unique_violation SQLSTATE — used to detect a race between two
 * concurrent `POST /payments` requests that both saw no pending row and
 * both tried to insert.
 */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Find the (userId, purpose) pending payment row.
 *
 * Scope must match the partial unique index
 * `payment_userId_purpose_pending_unique_idx` exactly — see schema.ts:
 *   UNIQUE (userId, purpose) WHERE status = 'PENDING' AND used = false.
 *
 * The previous implementation filtered by `tier` and a 24h window, which
 * was narrower than the index and caused constraint violations when a
 * user had an in-flight order at a different tier (or one older than 24h).
 */
async function findPendingPayment(userId: string, purpose: PaymentPurpose) {
  return db.query.payment.findFirst({
    where: and(
      eq(payment.userId, userId),
      eq(payment.purpose, purpose),
      eq(payment.status, "PENDING"),
      eq(payment.used, false),
    ),
  });
}

export async function initiatePaymentDomain(
  params: InitiatePaymentParams,
): Promise<InitiatePaymentResult> {
  const { userId, purpose, tier } = params;
  const config = TIER_CONFIG[tier];

  if (!config) {
    throw new Error("Tier configuration not found");
  }

  const existing = await findPendingPayment(userId, purpose);

  if (existing) {
    if (existing.tier !== tier) {
      throw new PendingOrderExistsError(
        existing.id,
        existing.providerId,
        existing.tier,
      );
    }

    if (existing.providerId) {
      return {
        paymentId: existing.id,
        orderId: existing.providerId,
        amount: config.price * 100,
        currency: "INR",
      };
    }

    // Stale row from a prior failed insert — clean up and fall through.
    await db
      .update(payment)
      .set({ status: "FAILED" })
      .where(eq(payment.id, existing.id));
  }

  const order = await RazorpayService.createOrder(
    config.price * 100,
    "INR",
    `rcpt_${serverNowMs()}`.substring(0, 40),
    { userId, purpose, tier },
  );

  const validUntil = fromNow(config.festivalDurationDays * MS.day);

  try {
    const inserted = await db
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
      paymentId: inserted[0].id,
      orderId: order.id,
      amount: config.price * 100,
      currency: "INR",
    };
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== PG_UNIQUE_VIOLATION) throw err;

    // Lost the race against a concurrent insert. The Razorpay order we
    // just created is now orphaned — caller will use the winner's orderId.
    // Razorpay's Orders API has no cancel endpoint, but unpaid orders
    // auto-expire (typically within 24h), so this is safe to leave.
    console.warn(
      "[initiatePaymentDomain] lost insert race; orphaned Razorpay order will auto-expire",
      { orderId: order.id, userId, tier },
    );

    const winner = await findPendingPayment(userId, purpose);
    if (!winner) throw err;

    if (winner.tier !== tier) {
      throw new PendingOrderExistsError(
        winner.id,
        winner.providerId,
        winner.tier,
      );
    }

    return {
      paymentId: winner.id,
      orderId: winner.providerId ?? order.id,
      amount: config.price * 100,
      currency: "INR",
    };
  }
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

  await publish(keys.superAdminStats(), {
    type: "payment_received",
    delta: 1,
    occurredAt: serverNowIso(),
  });

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
