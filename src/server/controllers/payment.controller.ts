import {
  getActivePaymentForUser,
  getLatestPaymentForUser,
  getPaymentByOrderId,
  updatePaymentStatus,
} from "@/server/models/payment.model";
import { RazorpayService } from "@/server/services/razorpay.service";

/**
 * Festival payment creation is done via server action initiateFestivalPayment
 * so that tier and purpose are always set. Use that for new flows.
 */

export const verifyPayment = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    payload;

  // Service Call: Verify Signature
  const isValid = RazorpayService.verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  );

  if (!isValid) {
    throw new Error("Invalid payment signature");
  }

  // Model Call: Get Payment
  const payment = await getPaymentByOrderId(razorpay_order_id);
  if (!payment) {
    throw new Error("Payment record not found");
  }

  // Model Call: Update Status
  // Business Rule: Update to COMPLETED
  await updatePaymentStatus(payment.id, "PAID", razorpay_payment_id);

  return true;
};

export const getUserStatus = async (userId: string, role: string = "USER") => {
  const activePayment = await getActivePaymentForUser(userId);

  // Check if user already has a festival (for USER role only)
  // SUPER_ADMINs can create unlimited festivals
  let hasExistingFestival = false;
  if (role === "USER") {
    const { findAllFestivals } = await import("@/server/models/festival.model");
    const userFestivals = await findAllFestivals({ ownerId: userId });
    hasExistingFestival = userFestivals.length > 0;
  }

  if (activePayment) {
    return {
      status: "ACTIVE",
      payment: {
        ...activePayment,
        validFrom: activePayment.createdAt,
      },
      // canCreateFestival is true ONLY if:
      // 1. Payment is active, AND
      // 2. User hasn't created a festival yet (or is SUPER_ADMIN)
      canCreateFestival: !hasExistingFestival,
    };
  }

  const latestPayment = await getLatestPaymentForUser(userId);

  if (latestPayment && latestPayment.status === "PAID") {
    // Payment exists but expired
    return {
      status: "EXPIRED",
      payment: {
        ...latestPayment,
        validFrom: latestPayment.createdAt,
      }, // return the expired payment for reference
      canCreateFestival: false,
    };
  }

  return {
    status: "NOT_PAID",
    payment: null,
    canCreateFestival: false,
  };
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
  const { prisma } = await import("@/lib/db");
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};
