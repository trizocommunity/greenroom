import type { Payment } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CreatePaymentInput = {
  userId: string;
  amount: number;
  currency?: string;
  validityDays?: number;
  razorpayOrderId?: string;
};

export async function createPayment(
  input: CreatePaymentInput,
): Promise<Payment> {
  const {
    userId,
    amount,
    currency = "INR",
    validityDays = 30,
    razorpayOrderId,
  } = input;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);

  return prisma.payment.create({
    data: {
      userId,
      amount,
      currency,
      status: "PENDING",
      validUntil,
      providerId: razorpayOrderId!, // Map to providerId
    },
  });
}

export async function getPaymentByOrderId(
  razorpayOrderId: string,
): Promise<Payment | null> {
  return prisma.payment.findFirst({
    where: { providerId: razorpayOrderId },
  });
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  return prisma.payment.findUnique({
    where: { id },
  });
}

export async function getActivePaymentForUser(
  userId: string,
): Promise<Payment | null> {
  const now = new Date();

  return prisma.payment.findFirst({
    where: {
      userId,
      status: "COMPLETED",
      validUntil: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLatestPaymentForUser(
  userId: string,
): Promise<Payment | null> {
  return prisma.payment.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updatePaymentStatus(
  id: string,
  status: string,
  razorpayId?: string,
): Promise<Payment> {
  return prisma.payment.update({
    where: { id },
    data: {
      status,
      ...(razorpayId && { referenceId: razorpayId }),
    },
  });
}
