import type { PaymentStatus } from "@/hooks/usePaymentStatus";
import api from "@/lib/axios";

export const paymentApi = {
  getStatus: async (): Promise<PaymentStatus> => {
    // using fetch wrapper or axios. user used fetch in usePaymentStatus.
    // I will use api (axios) for consistency if api is configured to handle baseUrl/auth.
    // user.api.ts uses "@/lib/axios".
    const { data } = await api.get<PaymentStatus>("/payments/status");
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
