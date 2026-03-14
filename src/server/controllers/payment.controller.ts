import {
  getUserPaymentsDomain,
  getUserStatusDomain,
  verifyPaymentByOrderIdDomain,
} from "@/server/services/payments-domain.service";

/**
 * Festival payment creation is done via server action initiateFestivalPayment
 * so that tier and purpose are always set. Use that for new flows.
 */

export const verifyPayment = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => {
  return verifyPaymentByOrderIdDomain(payload);
};

export const getUserStatus = async (userId: string, role: string = "USER") => {
  return getUserStatusDomain(userId, role);
};

export const getAllPayments = async () => {
  const { prisma } = await import("@/lib/db");
  return prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
};

export const getUserPayments = async (userId: string) => {
  return getUserPaymentsDomain(userId);
};
