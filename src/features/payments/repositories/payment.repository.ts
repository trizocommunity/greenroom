import { and, desc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { payment } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

export type Payment = typeof payment.$inferSelect;
export type PaymentStatus = "PENDING" | "PAID" | "FAILED";
export type Tier = "BASIC" | "STANDARD" | "PRO";

const PG_UNIQUE_VIOLATION = "23505";

export type CreatePaymentInput = {
  userId: string;
  amount: number;
  currency?: string;
  razorpayOrderId?: string;
  tier: Tier;
};

/**
 * Insert a PENDING payment row for a user.
 *
 * Respects the partial unique index
 * `payment_userId_purpose_pending_unique_idx` by first looking up an
 * existing pending row for the user; if found at a different tier it
 * throws `PendingOrderExistsError` (same shape as the one thrown by the
 * domain service so callers can branch uniformly). On race-loss (PG
 * 23505) re-fetches and behaves the same way.
 *
 * Prefer `initiatePaymentDomain` for new flows — it also creates the
 * Razorpay order. This helper exists for tests/admin paths that need to
 * insert a row without contacting Razorpay.
 */
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

export async function createPayment(
  input: CreatePaymentInput,
): Promise<Payment> {
  const { userId, amount, currency = "INR", razorpayOrderId, tier } = input;

  const existing = await db.query.payment.findFirst({
    where: and(
      eq(payment.userId, userId),
      eq(payment.status, "PENDING"),
      eq(payment.used, false),
    ),
  });

  if (existing && existing.tier !== tier) {
    throw new PendingOrderExistsError(
      existing.id,
      existing.providerId,
      existing.tier,
    );
  }

  const { randomUUID } = await import("crypto");

  try {
    const result = await db
      .insert(payment)
      .values({
        id: randomUUID(),
        updatedAt: serverNowIso(),
        userId,
        amount,
        currency,
        status: "PENDING",
        providerId: razorpayOrderId ?? "",
        tier,
      })
      .returning();
    return result[0];
  } catch (err) {
    if ((err as { code?: string } | null)?.code !== PG_UNIQUE_VIOLATION) {
      throw err;
    }
    const winner = await db.query.payment.findFirst({
      where: and(
        eq(payment.userId, userId),
        eq(payment.status, "PENDING"),
        eq(payment.used, false),
      ),
    });
    if (winner && winner.tier !== tier) {
      throw new PendingOrderExistsError(
        winner.id,
        winner.providerId,
        winner.tier,
      );
    }
    throw err;
  }
}

export async function getPaymentByOrderId(
  razorpayOrderId: string,
): Promise<Payment | null> {
  const result = await db.query.payment.findFirst({
    where: eq(payment.providerId, razorpayOrderId),
  });
  return result ?? null;
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const result = await db.query.payment.findFirst({
    where: eq(payment.id, id),
  });
  return result ?? null;
}

export async function getActivePaymentForUser(
  userId: string,
): Promise<Payment | null> {
  const result = await db.query.payment.findFirst({
    where: and(
      eq(payment.userId, userId),
      eq(payment.status, "PAID"),
      eq(payment.used, false),
    ),
    orderBy: [desc(payment.createdAt)],
  });
  return result ?? null;
}

export async function getLatestPaymentForUser(
  userId: string,
): Promise<Payment | null> {
  const result = await db.query.payment.findFirst({
    where: eq(payment.userId, userId),
    orderBy: [desc(payment.createdAt)],
  });
  return result ?? null;
}

export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  razorpayId?: string,
): Promise<Payment> {
  const result = await db
    .update(payment)
    .set({
      status,
      ...(razorpayId && { referenceId: razorpayId }),
    })
    .where(and(eq(payment.id, id), eq(payment.status, "PENDING")))
    .returning();
  return result[0];
}
