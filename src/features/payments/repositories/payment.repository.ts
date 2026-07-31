import { and, desc, eq } from "drizzle-orm";
import { db } from "@/core/database/client";
import { payment } from "@/core/database/schema";
import { serverNowIso } from "@/core/datetime/server";

export type Payment = typeof payment.$inferSelect;
export type PaymentStatus = "PENDING" | "PAID" | "FAILED";
export type Tier = "BASIC" | "STANDARD" | "PRO";

export type CreatePaymentInput = {
  userId: string;
  amount: number;
  currency?: string;
  razorpayOrderId?: string;
  tier?: Tier;
};

export async function createPayment(
  input: CreatePaymentInput,
): Promise<Payment> {
  const { userId, amount, currency = "INR", razorpayOrderId, tier } = input;

  const { randomUUID } = await import("crypto");

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
    })
    .returning();
  return result[0];
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
