import type { PaymentPurpose } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function getUnusedPayment(
  userId: string,
  purpose?: PaymentPurpose,
) {
  return prisma.payment.findFirst({
    where: {
      userId,
      status: "PAID",
      used: false,
      purpose: purpose,
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
