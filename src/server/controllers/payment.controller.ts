import { PRICING_CONFIG } from "@/config/pricing.config";
import {
  createPayment,
  getActivePaymentForUser,
  getLatestPaymentForUser,
  getPaymentByOrderId,
  updatePaymentStatus,
} from "@/server/models/payment.model";
import {
  RAZORPAY_KEY_ID,
  RazorpayService,
} from "@/server/services/razorpay.service";

const FESTIVAL_PRICE = PRICING_CONFIG.FESTIVAL_PASS.AMOUNT_PAISE;
const VALIDITY_DAYS = PRICING_CONFIG.FESTIVAL_PASS.VALIDITY_DAYS;

export const createOrder = async (userId: string) => {
  // Business Rule: Prevent duplicate active access
  const activePayment = await getActivePaymentForUser(userId);
  if (activePayment) {
    throw new Error("You already have an active festival pass");
  }

  const receipt = `rcpt_${userId.slice(-10)}_${Date.now().toString().slice(-8)}`;
  const notes = { userId, purpose: "festival_pass" };

  // Service Call: Create Order
  const order = await RazorpayService.createOrder(
    FESTIVAL_PRICE,
    "INR",
    receipt,
    notes,
  );

  // Model Call: Store Record
  await createPayment({
    userId,
    amount: FESTIVAL_PRICE,
    currency: "INR",
    validityDays: VALIDITY_DAYS,
    razorpayOrderId: order.id as string,
  });

  return {
    orderId: order.id,
    amount: FESTIVAL_PRICE,
    currency: "INR",
    keyId: RAZORPAY_KEY_ID,
  };
};

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
  await updatePaymentStatus(payment.id, "COMPLETED", razorpay_payment_id);

  return true;
};

export const getUserStatus = async (userId: string) => {
  const activePayment = await getActivePaymentForUser(userId);

  if (activePayment) {
    return {
      status: "ACTIVE",
      payment: activePayment,
      canCreateFestival: true,
    };
  }

  const latestPayment = await getLatestPaymentForUser(userId);

  if (latestPayment && latestPayment.status === "COMPLETED") {
    // Payment exists but expired
    return {
      status: "EXPIRED",
      payment: latestPayment, // return the expired payment for reference
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
      festival: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};
