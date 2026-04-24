import { db } from "@/lib/db";
import { payment as paymentTable } from "@/server/db/schema";
import { desc } from "drizzle-orm";
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
  return db.query.payment.findMany({
    orderBy: [desc(paymentTable.createdAt)],
    with: {
      user: {
        columns: {
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
