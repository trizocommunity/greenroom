import { z } from "zod";

export const verifyPaymentInput = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export const userStatusSchema = z.object({
  status: z.enum(["ACTIVE", "EXPIRED", "NOT_PAID"]),
  payment: z
    .object({
      id: z.string(),
      amount: z.number(),
      tier: z.string(),
      validFrom: z.string(),
    })
    .nullable(),
  canCreateFestival: z.boolean(),
});

export const paymentHistoryItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  festivalId: z.string().nullable(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  providerId: z.string(),
  referenceId: z.string().nullable(),
  used: z.boolean(),
  tier: z.enum(["BASIC", "STANDARD", "PRO"]).nullable(),
  createdAt: z.string(),
  festival: z
    .object({
      name: z.string(),
      slug: z.string(),
    })
    .nullable(),
  razorpayOrderId: z.string(),
  razorpayId: z.string().nullable(),
});

export const initiatePaymentInput = z.object({
  tier: z.enum(["BASIC", "STANDARD", "PRO"]),
});

export const initiatePaymentResponse = z.object({
  paymentId: z.string(),
  orderId: z.string(),
  amount: z.number(),
  currency: z.string(),
});

export const verifyPaymentResponse = z.object({ success: z.literal(true) });

export type VerifyPaymentInput = z.infer<typeof verifyPaymentInput>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type PaymentHistoryItem = z.infer<typeof paymentHistoryItemSchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentInput>;
export type InitiatePaymentResponse = z.infer<typeof initiatePaymentResponse>;
export type VerifyPaymentResponse = z.infer<typeof verifyPaymentResponse>;
