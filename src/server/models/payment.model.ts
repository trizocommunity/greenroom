import { TIER_CONFIG } from "@/config/pricing";
import { db } from "@/lib/db";
import { payment } from "../db/schema";
import { eq, and, gt, desc } from "drizzle-orm";

export type Payment = typeof payment.$inferSelect;
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type Tier = "BASIC" | "STANDARD" | "PRO";

export type CreatePaymentInput = {
  userId: string;
  amount: number;
  currency?: string;
  validityDays?: number;
  razorpayOrderId?: string;
  tier?: Tier;
};

export async function createPayment(
  input: CreatePaymentInput,
): Promise<Payment> {
  const {
    userId,
    amount,
    currency = "INR",
    validityDays,
    razorpayOrderId,
    tier,
  } = input;

  const days =
    validityDays ?? (tier ? (TIER_CONFIG[tier]?.durationDays ?? 30) : 30);
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + days);

  const { randomUUID } = await import("crypto");

  const result = await db.insert(payment).values({
    id: randomUUID(),
    updatedAt: new Date().toISOString(),
    userId,
    amount,
    currency,
    status: "PENDING",
    validUntil: validUntilDate.toISOString(),
    providerId: razorpayOrderId ?? "",
  }).returning();
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
  const now = new Date();

  const result = await db.query.payment.findFirst({
    where: and(
      eq(payment.userId, userId),
      eq(payment.status, "PAID"),
      gt(payment.validUntil, new Date().toISOString())
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
  const result = await db.update(payment).set({
    status,
    ...(razorpayId && { referenceId: razorpayId }),
  }).where(eq(payment.id, id)).returning();
  return result[0];
}
