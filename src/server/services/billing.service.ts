import type { PaymentPurpose } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function getUnusedPayment(
  userId: string,
  purpose?: PaymentPurpose,
) {
  const now = new Date();
  return prisma.payment.findFirst({
    where: {
      userId,
      status: "PAID",
      used: false,
      purpose: purpose,
      // Check if payment hasn't expired yet
      validUntil: { gt: now },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function consumePayment(
  paymentId: string,
  metadata: { festivalId?: string } = {},
) {
  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      used: true,
      festivalId: metadata.festivalId,
    },
  });
}
