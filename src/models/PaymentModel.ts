import { prisma } from '@/lib/db';
import { Payment, PaymentStatus as PrismaPaymentStatus } from '@prisma/client';

export type CreatePaymentInput = {
  userId: string;
  amount: number;
  currency?: string;
  validityDays?: number;
  razorpayOrderId?: string;
};

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  const { userId, amount, currency = 'INR', validityDays = 30, razorpayOrderId } = input;
  
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);

  return prisma.payment.create({
    data: {
      userId,
      amount,
      currency,
      status: 'PENDING',
      validUntil,
      razorpayOrderId,
    },
  });
}

export async function getPaymentByOrderId(razorpayOrderId: string): Promise<Payment | null> {
  return prisma.payment.findFirst({
    where: { razorpayOrderId },
  });
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  return prisma.payment.findUnique({
    where: { id },
  });
}

export async function getActivePaymentForUser(userId: string): Promise<Payment | null> {
  const now = new Date();
  
  return prisma.payment.findFirst({
    where: {
      userId,
      status: 'COMPLETED',
      validUntil: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getLatestPaymentForUser(userId: string): Promise<Payment | null> {
  return prisma.payment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updatePaymentStatus(
  id: string,
  status: PrismaPaymentStatus,
  razorpayId?: string
): Promise<Payment> {
  return prisma.payment.update({
    where: { id },
    data: {
      status,
      ...(razorpayId && { razorpayId }),
    },
  });
}

export async function getUserPaymentStatus(userId: string): Promise<{
  status: 'NOT_PAID' | 'ACTIVE' | 'EXPIRED';
  payment: Payment | null;
  canCreateFestival: boolean;
}> {
  const activePayment = await getActivePaymentForUser(userId);
  
  if (activePayment) {
    return {
      status: 'ACTIVE',
      payment: activePayment,
      canCreateFestival: true,
    };
  }

  const latestPayment = await getLatestPaymentForUser(userId);
  
  if (latestPayment && latestPayment.status === 'COMPLETED') {
    // Payment exists but expired
    return {
      status: 'EXPIRED',
      payment: latestPayment,
      canCreateFestival: false,
    };
  }

  return {
    status: 'NOT_PAID',
    payment: null,
    canCreateFestival: false,
  };
}
