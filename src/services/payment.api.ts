import type { PaymentStatus } from "@/hooks/usePaymentStatus";
import api from "@/lib/axios";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "EXPIRED";
  razorpayOrderId: string | null;
  razorpayId: string | null;
  createdAt: string;
  validFrom: string;
  validUntil: string;
  festival?: {
    name: string;
  };
}

export const paymentApi = {
  getStatus: async (): Promise<PaymentStatus> => {
    // using fetch wrapper or axios. user used fetch in usePaymentStatus.
    // I will use api (axios) for consistency if api is configured to handle baseUrl/auth.
    // user.api.ts uses "@/lib/axios".
    const { data } = await api.get<PaymentStatus>("/payments/status");
    return data;
  },

  getHistory: async (): Promise<Payment[]> => {
    const { data } = await api.get<Payment[]>("/payments/history");
    return data;
  },

  createOrder: async () => {
    const { data } = await api.post("/payments/create-order");
    return data;
  },

  verify: async (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    const { data } = await api.post("/payments/verify", payload);
    return data;
  },
};
